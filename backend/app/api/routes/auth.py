from fastapi import APIRouter, Depends, HTTPException, status, Request
from app.core.security import get_current_user
from app.api.deps import get_admin_user
from app.services.firestore import FirestoreService
from app.schemas.user import UserResponse, ProfileCreate, ProfileResponse, UserRoleUpdate
from typing import Dict, Any, List
from pydantic import BaseModel

router = APIRouter()


class PageVisitRequest(BaseModel):
    page_path: str
    start_time: str  # ISO format datetime string
    metadata: Dict[str, Any] = {}


class PageVisitEndRequest(BaseModel):
    visit_id: str
    end_time: str  # ISO format datetime string


class AnalyticsEventRequest(BaseModel):
    event_type: str  # 'page_view', 'session_start', 'session_end', 'login'
    metadata: Dict[str, Any] = {}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get current authenticated user information
    Also logs a connection event
    """
    uid = current_user["uid"]
    
    # Get user from Firestore
    user_data = FirestoreService.get_user(uid)
    
    if not user_data:
        # Create user if doesn't exist
        user_data = FirestoreService.create_user(
            uid=uid,
            email=current_user.get("email"),
            role="user"
        )
    
        # Log connection event
        try:
            # Get user agent and IP from request headers
            user_agent = request.headers.get("user-agent", "unknown")
            client_ip = request.client.host if request.client else "unknown"
            
            # Generate session_id
            session_id = f"{uid}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
            
            # Log session_start as a page visit to the root page
            # This way we only use page_visits, not analytics_events
            FirestoreService.log_page_visit(
                user_id=uid,
                page_path="/",
                start_time=datetime.utcnow(),
                metadata={
                    "user_agent": user_agent,
                    "ip_address": client_ip,
                    "session_id": session_id,
                    "event_type": "session_start",  # Mark as session start
                }
            )
        except Exception as e:
            # Don't fail the request if logging fails
            import logging
            logging.warning(f"Failed to log connection/analytics event: {e}")
    
    return UserResponse(
        uid=uid,
        email=current_user.get("email"),
        name=current_user.get("name"),
        picture=current_user.get("picture"),
        role=user_data.get("role", "user"),
        created_at=user_data.get("created_at"),
    )


@router.post("/onboarding", response_model=ProfileResponse)
async def create_profile(
    profile: ProfileCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create or update user profile (onboarding)
    """
    uid = current_user["uid"]
    
    # Ensure user exists
    user_data = FirestoreService.get_user(uid)
    if not user_data:
        FirestoreService.create_user(uid=uid, email=current_user.get("email"))
    
    # Create or update profile
    profile_data = FirestoreService.create_or_update_profile(
        user_id=uid,
        profile_data=profile.dict(exclude_none=True)
    )
    
    # Get the created profile
    created_profile = FirestoreService.get_profile(uid)
    
    return ProfileResponse(
        user_id=uid,
        age=created_profile.get("age"),
        sexe=created_profile.get("sexe"),
        metier=created_profile.get("metier"),
        raison_visite=created_profile.get("raison_visite"),
        nationalite=created_profile.get("nationalite"),
        created_at=created_profile.get("created_at"),
        updated_at=created_profile.get("updated_at"),
    )


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get user profile
    """
    uid = current_user["uid"]
    profile = FirestoreService.get_profile(uid)
    
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    
    return ProfileResponse(
        user_id=uid,
        age=profile.get("age"),
        sexe=profile.get("sexe"),
        metier=profile.get("metier"),
        raison_visite=profile.get("raison_visite"),
        nationalite=profile.get("nationalite"),
        created_at=profile.get("created_at"),
        updated_at=profile.get("updated_at"),
    )


@router.put("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: str,
    role_update: UserRoleUpdate,
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Update user role (admin only)
    """
    # Validate role
    if role_update.role not in ["user", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be 'user' or 'admin'"
        )
    
    # Get user
    user_data = FirestoreService.get_user(user_id)
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update role
    FirestoreService.update_user(user_id, {"role": role_update.role})
    
    # Return updated user
    updated_user = FirestoreService.get_user(user_id)
    return UserResponse(
        uid=user_id,
        email=updated_user.get("email"),
        role=updated_user.get("role", "user"),
        created_at=updated_user.get("created_at"),
    )


@router.get("/users", response_model=List[UserResponse])
async def list_users(
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """
    List all users (admin only)
    """
    try:
        from app.services.firestore import get_db
        db = get_db()
        
        users_ref = db.collection("users")
        docs = users_ref.stream()
        
        users = []
        for doc in docs:
            user_data = doc.to_dict()
            users.append(UserResponse(
                uid=doc.id,
                email=user_data.get("email"),
                role=user_data.get("role", "user"),
                created_at=user_data.get("created_at"),
            ))
        
        return users
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing users: {str(e)}"
        )


@router.post("/page-visit")
async def log_page_visit(
    request: PageVisitRequest,
    http_request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Log a page visit with start time
    """
    try:
        from datetime import datetime
        
        user_id = current_user["uid"]
        
        # Parse start_time from ISO format string
        try:
            start_time = datetime.fromisoformat(request.start_time.replace('Z', '+00:00'))
        except:
            start_time = datetime.utcnow()
        
        # Get user agent and IP from request headers
        user_agent = http_request.headers.get("user-agent", "unknown")
        client_ip = http_request.client.host if http_request.client else "unknown"
        referrer = http_request.headers.get("referer", "unknown")
        
        # Merge request metadata with automatic metadata
        metadata = {
            "user_agent": user_agent,
            "ip_address": client_ip,
            "referrer": referrer,
            **request.metadata
        }
        
        visit_id = FirestoreService.log_page_visit(
            user_id=user_id,
            page_path=request.page_path,
            start_time=start_time,
            metadata=metadata
        )
        
        # page_view is already logged via log_page_visit above
        # No need for separate analytics_events collection
        
        return {"visit_id": visit_id, "message": "Page visit logged successfully"}
    except Exception as e:
        import logging
        logging.error(f"Error logging page visit: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error logging page visit: {str(e)}"
        )


@router.post("/analytics-event")
async def log_analytics_event(
    request: AnalyticsEventRequest,
    http_request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Log an analytics event (page_view, session_start, session_end, login)
    """
    try:
        from datetime import datetime
        
        user_id = current_user["uid"]
        
        # Get session_id from metadata or generate one
        session_id = request.metadata.get("session_id")
        if not session_id:
            # Try to get from sessionStorage equivalent (we'll pass it from frontend)
            session_id = request.metadata.get("session_id")
        
        # Get user agent and IP from request headers
        user_agent = http_request.headers.get("user-agent", "unknown")
        client_ip = http_request.client.host if http_request.client else "unknown"
        
        # Merge request metadata with automatic metadata
        metadata = {
            "user_agent": user_agent,
            "ip_address": client_ip,
            **request.metadata
        }
        
        # Use page_visits instead of analytics_events
        # For session_end, we log it as a special page visit
        if request.event_type == "session_end":
            # Get device type from user agent
            import re
            user_agent_lower = user_agent.lower()
            device_type = "unknown"
            
            # Check for tablet
            if any(x in user_agent_lower for x in ["tablet", "ipad", "playbook", "silk"]):
                device_type = "tablet"
            # Check for mobile
            elif any(x in user_agent_lower for x in ["mobile", "iphone", "ipod", "android", "blackberry", "opera", "mini", "windows ce", "palm", "smartphone", "iemobile"]):
                device_type = "mobile"
            else:
                device_type = "desktop"
            
            # Add device_type to metadata
            metadata["device_type"] = device_type
            
            FirestoreService.log_page_visit(
                user_id=user_id,
                page_path="/_session_end",  # Special path to mark session end
                start_time=datetime.utcnow(),
                metadata=metadata
            )
        elif request.event_type == "session_start":
            # Already handled in /me endpoint
            pass
        elif request.event_type == "login":
            FirestoreService.log_page_visit(
                user_id=user_id,
                page_path="/_login",  # Special path to mark login
                start_time=datetime.utcnow(),
                metadata=metadata
            )
        
        return {"message": "Analytics event logged successfully"}
    except Exception as e:
        import logging
        logging.error(f"Error logging analytics event: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error logging analytics event: {str(e)}"
        )


@router.post("/page-visit/end")
async def end_page_visit(
    request: PageVisitEndRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update a page visit with end time (when user leaves the page)
    """
    try:
        from datetime import datetime
        
        # Parse end_time from ISO format string and ensure it's timezone-aware
        from datetime import timezone
        try:
            end_time = datetime.fromisoformat(request.end_time.replace('Z', '+00:00'))
            # Ensure it's timezone-aware
            if end_time.tzinfo is None:
                end_time = end_time.replace(tzinfo=timezone.utc)
        except:
            end_time = datetime.now(timezone.utc)
        
        import logging
        logging.info(f"Updating page visit {request.visit_id} with end_time {end_time.isoformat()}")
        
        FirestoreService.update_page_visit_end_time(
            visit_id=request.visit_id,
            end_time=end_time
        )
        
        logging.info(f"Successfully updated page visit {request.visit_id}")
        
        return {
            "message": "Page visit end time updated successfully",
            "visit_id": request.visit_id,
            "end_time": end_time.isoformat()
        }
    except Exception as e:
        import logging
        logging.error(f"Error updating page visit end time: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating page visit end time: {str(e)}"
        )

