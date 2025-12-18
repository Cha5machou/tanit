from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel


class UserRole(str):
    USER = "user"
    ADMIN = "admin"
    SUPER_ADMIN = "super-admin"


class User(BaseModel):
    uid: str
    role: Literal["user", "admin", "super-admin"] = "user"
    site_id: Optional[str] = None
    created_at: datetime = datetime.now()


class Profile(BaseModel):
    user_id: str
    age: Optional[int] = None
    sexe: Optional[str] = None
    metier: Optional[str] = None
    raison_visite: Optional[str] = None
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()

