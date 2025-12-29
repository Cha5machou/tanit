from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class POICreate(BaseModel):
    name: str = Field(..., description="Nom du point d'intérêt")
    lat: float = Field(..., description="Latitude")
    lng: float = Field(..., description="Longitude")
    description: str = Field(..., description="Description (peut contenir des liens HTML)")
    is_ad: bool = Field(default=False, description="Indique si c'est une publicité")
    photo_url: Optional[str] = Field(None, description="URL de la photo")
    audio_url: Optional[str] = Field(None, description="URL de l'audio")


class POIUpdate(BaseModel):
    name: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    description: Optional[str] = None
    is_ad: Optional[bool] = None
    photo_url: Optional[str] = None
    audio_url: Optional[str] = None


class POIResponse(BaseModel):
    poi_id: str
    name: str
    lat: float
    lng: float
    description: str
    is_ad: bool
    photo_url: Optional[str] = None
    audio_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

