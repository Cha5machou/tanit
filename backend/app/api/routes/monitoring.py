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
        
        return {
            "total_users": total_users,
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
    """
    try:
        db = get_db()
        events_ref = db.collection("events")
        
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
        
        # Query events
        query = events_ref.where("event_type", "==", "connection").where("timestamp", ">=", start_time)
        events = query.stream()
        
        connections = []
        for event in events:
            data = event.to_dict()
            connections.append({
                "timestamp": data.get("timestamp"),
                "user_id": data.get("user_id"),
            })
        
        return {
            "period": period,
            "start_time": start_time.isoformat(),
            "end_time": now.isoformat(),
            "total_connections": len(connections),
            "connections": connections,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting connection stats: {str(e)}"
        )


@router.get("/stats/sessions")
async def get_session_stats(
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Get session statistics (average session length, etc.) (Admin only)
    """
    try:
        db = get_db()
        events_ref = db.collection("events")
        
        # Get all session events
        query = events_ref.where("event_type", "in", ["session_start", "session_end"])
        events = query.stream()
        
        sessions = {}
        for event in events:
            data = event.to_dict()
            session_id = data.get("session_id")
            event_type = data.get("event_type")
            timestamp = data.get("timestamp")
            
            if session_id not in sessions:
                sessions[session_id] = {}
            
            if event_type == "session_start":
                sessions[session_id]["start"] = timestamp
            elif event_type == "session_end":
                sessions[session_id]["end"] = timestamp
        
        # Calculate average session length
        session_lengths = []
        for session_id, session_data in sessions.items():
            if "start" in session_data and "end" in session_data:
                start = session_data["start"]
                end = session_data["end"]
                if isinstance(start, datetime) and isinstance(end, datetime):
                    length = (end - start).total_seconds()
                    session_lengths.append(length)
        
        avg_session_length = sum(session_lengths) / len(session_lengths) if session_lengths else 0
        
        return {
            "total_sessions": len(sessions),
            "completed_sessions": len(session_lengths),
            "average_session_length_seconds": avg_session_length,
            "average_session_length_minutes": avg_session_length / 60 if avg_session_length else 0,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting session stats: {str(e)}"
        )


@router.get("/langsmith/dashboard")
async def get_langsmith_dashboard(
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Get LangSmith dashboard URL and basic stats (Admin only)
    """
    from app.core.config import settings
    
    if not settings.LANGSMITH_API_KEY:
        return {
            "enabled": False,
            "message": "LangSmith is not configured",
            "dashboard_url": None,
        }
    
    dashboard_url = f"https://smith.langchain.com/projects/{settings.LANGSMITH_PROJECT}" if settings.LANGSMITH_PROJECT else "https://smith.langchain.com"
    
    return {
        "enabled": True,
        "dashboard_url": dashboard_url,
        "project": settings.LANGSMITH_PROJECT,
    }

