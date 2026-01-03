from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class AdCreate(BaseModel):
    name: str = Field(..., description="Nom de l'annonceur")
    description: str = Field(..., description="Description de l'annonce")
    logo_url: Optional[str] = Field(None, description="URL du logo")
    link: str = Field(..., description="URL de destination")
    position: str = Field(..., description="Position: 'left' ou 'right'")
    slot: int = Field(..., ge=1, le=5, description="Emplacement (1-5)")
    active: bool = Field(default=True, description="Annonce active ou non")


class AdUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    link: Optional[str] = None
    position: Optional[str] = None
    slot: Optional[int] = Field(None, ge=1, le=5)
    active: Optional[bool] = None


class AdResponse(BaseModel):
    ad_id: str
    name: str
    description: str
    logo_url: Optional[str] = None
    link: str
    position: str
    slot: int
    active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

