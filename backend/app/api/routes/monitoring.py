from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_admin_user
from app.services.firestore import FirestoreService, get_db
from typing import Dict, Any, List
from datetime import datetime, timedelta
from google.cloud import firestore as fs

router = APIRouter()


@router.post("/close-inactive-visits")
async def close_inactive_visits(
    inactivity_minutes: int = 30,
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Close page visits that have been inactive for a specified period (Admin only)
    Uses the last event (page visit) time per user to determine inactivity
    """
    try:
        closed_count = FirestoreService.close_inactive_page_visits(inactivity_minutes=inactivity_minutes)
        return {
            "message": f"Closed {closed_count} inactive page visits",
            "closed_count": closed_count,
            "inactivity_minutes": inactivity_minutes,
        }
    except Exception as e:
        import traceback
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error closing inactive visits: {str(e)}\n{traceback.format_exc()}"
        )


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
    Uses page visits to track user activity (more detailed than connection events)
    """
    try:
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
        
        # Get page visits from Firestore (more detailed than connection events)
        page_visits = FirestoreService.get_page_visits(
            start_time=start_time,
            end_time=now
        )
        
        connections_by_hour = {}
        connections_by_day = {}
        unique_users = set()
        page_views_by_page = {}
        
        for visit in page_visits:
            user_id = visit.get("user_id")
            start_time_visit = visit.get("start_time")
            page_path = visit.get("page_path", "unknown")
            
            if not user_id or not start_time_visit:
                continue
            
            # Ensure start_time_visit is a datetime
            if isinstance(start_time_visit, str):
                try:
                    start_time_visit = datetime.fromisoformat(start_time_visit.replace('Z', '+00:00'))
                except:
                    continue
            elif not isinstance(start_time_visit, datetime):
                continue
            
            # Filter by time range (double check)
            if start_time_visit >= start_time:
                unique_users.add(user_id)
                
                # Group by hour
                hour_key = start_time_visit.strftime("%Y-%m-%d %H:00")
                connections_by_hour[hour_key] = connections_by_hour.get(hour_key, 0) + 1
                
                # Group by day
                day_key = start_time_visit.strftime("%Y-%m-%d")
                connections_by_day[day_key] = connections_by_day.get(day_key, 0) + 1
                
                # Track page views by page
                page_views_by_page[page_path] = page_views_by_page.get(page_path, 0) + 1
        
        # Convert to lists for charts
        hourly_data = [{"hour": k, "count": v} for k, v in sorted(connections_by_hour.items())]
        daily_data = [{"day": k, "count": v} for k, v in sorted(connections_by_day.items())]
        page_views_data = [{"page": k, "views": v} for k, v in sorted(page_views_by_page.items(), key=lambda x: x[1], reverse=True)]
        
        return {
            "period": period,
            "start_time": start_time.isoformat(),
            "end_time": now.isoformat(),
            "total_connections": len(unique_users),
            "total_page_visits": len(page_visits),
            "hourly_breakdown": hourly_data,
            "daily_breakdown": daily_data,
            "page_views_by_page": page_views_data[:10],  # Top 10 pages
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
    Uses page visits to calculate session lengths based on user activity
    """
    try:
        # Get all page visits to calculate session statistics
        page_visits = FirestoreService.get_page_visits()
        
        # Group visits by user and calculate session metrics
        user_sessions = {}
        session_lengths = []
        page_durations = []
        
        for visit in page_visits:
            user_id = visit.get("user_id")
            start_time = visit.get("start_time")
            end_time = visit.get("end_time")
            duration = visit.get("duration_seconds")
            page_path = visit.get("page_path", "unknown")
            
            if not user_id or not start_time:
                continue
            
            # Ensure start_time is a datetime
            if isinstance(start_time, str):
                try:
                    start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                except:
                    continue
            elif not isinstance(start_time, datetime):
                continue
            
            # Track user sessions
            if user_id not in user_sessions:
                user_sessions[user_id] = {
                    "first_visit": start_time,
                    "last_visit": start_time,
                    "page_count": 0,
                    "total_duration": 0,
                }
            
            user_sessions[user_id]["page_count"] += 1
            if start_time < user_sessions[user_id]["first_visit"]:
                user_sessions[user_id]["first_visit"] = start_time
            if start_time > user_sessions[user_id]["last_visit"]:
                user_sessions[user_id]["last_visit"] = start_time
            
            # Calculate duration
            if duration:
                user_sessions[user_id]["total_duration"] += duration
                page_durations.append(duration)
            elif end_time:
                # Calculate duration from end_time
                if isinstance(end_time, str):
                    try:
                        end_time = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
                    except:
                        end_time = None
                elif not isinstance(end_time, datetime):
                    end_time = None
                
                if end_time:
                    duration = (end_time - start_time).total_seconds()
                    user_sessions[user_id]["total_duration"] += duration
                    page_durations.append(duration)
        
        # Calculate session lengths (time between first and last visit per user)
        active_sessions = 0
        completed_sessions = 0
        
        for user_id, session_data in user_sessions.items():
            session_length = (session_data["last_visit"] - session_data["first_visit"]).total_seconds()
            
            # If last visit was recent (within last 30 minutes), consider it active
            now = datetime.utcnow()
            time_since_last_visit = (now - session_data["last_visit"]).total_seconds()
            
            if time_since_last_visit < 1800:  # 30 minutes
                active_sessions += 1
                # Estimate session length as time since first visit
                session_length = (now - session_data["first_visit"]).total_seconds()
            else:
                completed_sessions += 1
            
            # Minimum 10 seconds per session
            session_length = max(session_length, 10)
            session_lengths.append(session_length)
        
        # Calculate averages
        avg_session_length = sum(session_lengths) / len(session_lengths) if session_lengths else 0
        avg_page_duration = sum(page_durations) / len(page_durations) if page_durations else 0
        
        return {
            "total_sessions": len(user_sessions),
            "active_sessions": active_sessions,
            "completed_sessions": completed_sessions,
            "average_session_length_seconds": round(avg_session_length, 2),
            "average_session_length_minutes": round(avg_session_length / 60, 2),
            "average_page_duration_seconds": round(avg_page_duration, 2),
            "total_page_visits": len(page_visits),
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


