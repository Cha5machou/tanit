from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user
from app.api.deps import get_admin_user
from app.services.firestore import FirestoreService
from app.schemas.user import UserResponse, ProfileCreate, ProfileResponse, UserRoleUpdate
from typing import Dict, Any, List

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get current authenticated user information
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

