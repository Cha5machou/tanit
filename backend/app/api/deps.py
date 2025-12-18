from fastapi import Depends, HTTPException, status
from app.core.security import get_current_user, verify_token
from app.services.firestore import FirestoreService
from typing import Dict, Any, Literal


async def get_current_user_with_role(
    required_role: Literal["admin", "super-admin"] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get current user and check role if required
    """
    uid = current_user["uid"]
    user_data = FirestoreService.get_user(uid)
    
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user_role = user_data.get("role", "user")
    
    if required_role:
        if required_role == "admin" and user_role not in ["admin", "super-admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        if required_role == "super-admin" and user_role != "super-admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Super-admin access required"
            )
    
    return {
        **current_user,
        "role": user_role,
        "site_id": user_data.get("site_id"),
    }

