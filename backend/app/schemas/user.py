from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserResponse(BaseModel):
    uid: str
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None
    role: str = "user"
    site_id: Optional[str] = None
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ProfileCreate(BaseModel):
    age: Optional[int] = None
    sexe: Optional[str] = None
    metier: Optional[str] = None
    raison_visite: Optional[str] = None


class ProfileResponse(BaseModel):
    user_id: str
    age: Optional[int] = None
    sexe: Optional[str] = None
    metier: Optional[str] = None
    raison_visite: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

