from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_admin_user
from app.services.firestore import FirestoreService, get_db
from typing import Dict, Any, List
from datetime import datetime, timedelta
from google.cloud import firestore as fs

router = APIRouter()


@router.get("/stats/users")
async def get_user_stats(
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Get user statistics (Admin only)
    """
    try:
        db = get_db()
        users_ref = db.collection("users")
        users = users_ref.stream()
        
        total_users = 0
        for _ in users:
            total_users += 1
        
        # Get conversations stats
        conversations_ref = db.collection("conversations")
        conversations = conversations_ref.stream()
        
        total_conversations = 0
        conversations_by_user = {}
        for conv in conversations:
            total_conversations += 1
            data = conv.to_dict()
            user_id = data.get("user_id")
            if user_id:
                conversations_by_user[user_id] = conversations_by_user.get(user_id, 0) + 1
        
        avg_conversations_per_user = total_conversations / total_users if total_users > 0 else 0
        
        return {
            "total_users": total_users,
            "total_conversations": total_conversations,
            "average_conversations_per_user": round(avg_conversations_per_user, 2),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting user stats: {str(e)}"
        )


@router.get("/stats/connections")
async def get_connection_stats(
    period: str = "day",  # hour, day, week
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Get connection statistics by period (Admin only)
    Uses user creation dates and conversation creation as proxy for connections
    """
    try:
        db = get_db()
        
        # Calculate time range
        now = datetime.utcnow()
        if period == "hour":
            start_time = now - timedelta(hours=1)
        elif period == "day":
            start_time = now - timedelta(days=1)
        elif period == "week":
            start_time = now - timedelta(weeks=1)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Period must be 'hour', 'day', or 'week'"
            )
        
        # Get users created in the period (as proxy for new connections)
        users_ref = db.collection("users")
        users = users_ref.stream()
        
        connections_by_hour = {}
        connections_by_day = {}
        unique_users = set()
        
        for user_doc in users:
            data = user_doc.to_dict()
            created_at = data.get("created_at")
            
            if created_at:
                # Convert Firestore Timestamp to datetime
                if hasattr(created_at, 'timestamp'):
                    user_time = datetime.fromtimestamp(created_at.timestamp())
                elif isinstance(created_at, datetime):
                    user_time = created_at
                else:
                    continue
                
                # Filter by time range
                if user_time >= start_time:
                    unique_users.add(user_doc.id)
                    
                    # Group by hour
                    hour_key = user_time.strftime("%Y-%m-%d %H:00")
                    connections_by_hour[hour_key] = connections_by_hour.get(hour_key, 0) + 1
                    
                    # Group by day
                    day_key = user_time.strftime("%Y-%m-%d")
                    connections_by_day[day_key] = connections_by_day.get(day_key, 0) + 1
        
        # Also count conversations created in period (active users)
        conversations_ref = db.collection("conversations")
        conversations = conversations_ref.stream()
        
        for conv in conversations:
            data = conv.to_dict()
            created_at = data.get("created_at")
            
            if created_at:
                if hasattr(created_at, 'timestamp'):
                    conv_time = datetime.fromtimestamp(created_at.timestamp())
                elif isinstance(created_at, datetime):
                    conv_time = created_at
                else:
                    continue
                
                if conv_time >= start_time:
                    user_id = data.get("user_id")
                    if user_id:
                        unique_users.add(user_id)
                        
                        hour_key = conv_time.strftime("%Y-%m-%d %H:00")
                        connections_by_hour[hour_key] = connections_by_hour.get(hour_key, 0) + 1
                        
                        day_key = conv_time.strftime("%Y-%m-%d")
                        connections_by_day[day_key] = connections_by_day.get(day_key, 0) + 1
        
        # Convert to lists for charts
        hourly_data = [{"hour": k, "count": v} for k, v in sorted(connections_by_hour.items())]
        daily_data = [{"day": k, "count": v} for k, v in sorted(connections_by_day.items())]
        
        return {
            "period": period,
            "start_time": start_time.isoformat(),
            "end_time": now.isoformat(),
            "total_connections": len(unique_users),
            "hourly_breakdown": hourly_data,
            "daily_breakdown": daily_data,
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = f"Error getting connection stats: {str(e)}\n{traceback.format_exc()}"
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=error_detail
        )


@router.get("/stats/sessions")
async def get_session_stats(
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Get session statistics (average session length, etc.) (Admin only)
    Uses conversations as proxy for sessions
    """
    try:
        db = get_db()
        conversations_ref = db.collection("conversations")
        conversations = conversations_ref.stream()
        
        # Group conversations by user and calculate session length based on conversation activity
        user_sessions = {}
        session_lengths = []
        
        for conv in conversations:
            data = conv.to_dict()
            user_id = data.get("user_id")
            created_at = data.get("created_at")
            updated_at = data.get("updated_at")
            messages = data.get("messages", [])
            
            if not user_id or not created_at:
                continue
            
            # Convert timestamps
            if hasattr(created_at, 'timestamp'):
                start_dt = datetime.fromtimestamp(created_at.timestamp())
            elif isinstance(created_at, datetime):
                start_dt = created_at
            else:
                continue
            
            if updated_at:
                if hasattr(updated_at, 'timestamp'):
                    end_dt = datetime.fromtimestamp(updated_at.timestamp())
                elif isinstance(updated_at, datetime):
                    end_dt = updated_at
                else:
                    end_dt = start_dt
            else:
                end_dt = start_dt
            
            # Calculate session length (time between first and last message)
            if len(messages) > 1:
                # Estimate session length based on message count and time span
                length = (end_dt - start_dt).total_seconds()
                # Minimum 30 seconds per conversation
                length = max(length, 30)
                session_lengths.append(length)
            
            if user_id not in user_sessions:
                user_sessions[user_id] = {
                    "start": start_dt,
                    "end": end_dt,
                    "conversations": 0
                }
            
            user_sessions[user_id]["conversations"] += 1
            if end_dt > user_sessions[user_id]["end"]:
                user_sessions[user_id]["end"] = end_dt
        
        # Calculate average session length
        avg_session_length = sum(session_lengths) / len(session_lengths) if session_lengths else 0
        
        # Calculate total active sessions (users with conversations)
        total_sessions = len(user_sessions)
        
        return {
            "total_sessions": total_sessions,
            "completed_sessions": len(session_lengths),
            "average_session_length_seconds": avg_session_length,
            "average_session_length_minutes": avg_session_length / 60 if avg_session_length else 0,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting session stats: {str(e)}"
        )


@router.get("/stats/conversations")
async def get_conversation_stats(
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Get conversation statistics (Admin only)
    """
    try:
        db = get_db()
        conversations_ref = db.collection("conversations")
        conversations = conversations_ref.stream()
        
        total_conversations = 0
        conversations_by_user = {}
        conversations_by_day = {}
        total_messages = 0
        
        for conv in conversations:
            total_conversations += 1
            data = conv.to_dict()
            user_id = data.get("user_id")
            messages = data.get("messages", [])
            created_at = data.get("created_at")
            
            total_messages += len(messages)
            
            if user_id:
                conversations_by_user[user_id] = conversations_by_user.get(user_id, 0) + 1
            
            # Group by day
            if created_at:
                if hasattr(created_at, 'timestamp'):
                    conv_time = datetime.fromtimestamp(created_at.timestamp())
                elif isinstance(created_at, datetime):
                    conv_time = created_at
                else:
                    continue
                
                day_key = conv_time.strftime("%Y-%m-%d")
                conversations_by_day[day_key] = conversations_by_day.get(day_key, 0) + 1
        
        # Get total users
        users_ref = db.collection("users")
        users = users_ref.stream()
        total_users = sum(1 for _ in users)
        
        avg_conversations_per_user = total_conversations / total_users if total_users > 0 else 0
        avg_messages_per_conversation = total_messages / total_conversations if total_conversations > 0 else 0
        
        daily_data = [{"day": k, "count": v} for k, v in sorted(conversations_by_day.items())]
        
        return {
            "total_conversations": total_conversations,
            "total_messages": total_messages,
            "average_conversations_per_user": round(avg_conversations_per_user, 2),
            "average_messages_per_conversation": round(avg_messages_per_conversation, 2),
            "daily_breakdown": daily_data,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting conversation stats: {str(e)}"
        )


