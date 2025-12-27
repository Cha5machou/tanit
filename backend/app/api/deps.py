from fastapi import Depends, HTTPException, status
from app.core.security import get_current_user, verify_token
from app.services.firestore import FirestoreService
from typing import Dict, Any, Literal


async def get_current_user_with_role(
    required_role: Literal["admin"] = None,
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
    
    if required_role == "admin" and user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return {
        **current_user,
        "role": user_role,
    }


async def get_admin_user(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Dependency that requires admin role
    """
    return await get_current_user_with_role(required_role="admin", current_user=current_user)

