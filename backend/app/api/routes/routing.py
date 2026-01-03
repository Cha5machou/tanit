from fastapi import APIRouter, Depends
from app.api.deps import get_current_user
from typing import Dict, Any
from pydantic import BaseModel
from math import sin, cos, radians, atan2, sqrt

router = APIRouter()


class RouteRequest(BaseModel):
    from_lat: float
    from_lng: float
    to_lat: float
    to_lng: float


class RouteResponse(BaseModel):
    coordinates: list[list[float]]  # [[lat, lng], ...]
    distance: float  # in meters
    duration: float  # in seconds


@router.post("/route", response_model=RouteResponse)
async def get_route(
    request: RouteRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get straight-line walking route (no external routing service)
    Calculates distance using Haversine formula and estimates duration based on walking speed (4-6 km/h)
    """
    # Calculate distance using Haversine formula
    R = 6371e3  # Earth radius in meters
    lat1, lng1 = request.from_lat, request.from_lng
    lat2, lng2 = request.to_lat, request.to_lng
    φ1 = radians(lat1)
    φ2 = radians(lat2)
    Δφ = radians(lat2 - lat1)
    Δλ = radians(lng2 - lng1)
    a = sin(Δφ/2)**2 + cos(φ1) * cos(φ2) * sin(Δλ/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    distance = R * c
    
    # Calculate duration based on walking speed (4-6 km/h)
    walking_speed_ms = 1.39  # 5 km/h average
    if distance > 1000:
        walking_speed_ms = 1.53  # ~5.5 km/h for longer distances
    elif distance < 200:
        walking_speed_ms = 1.25  # ~4.5 km/h for short distances
    duration = distance / walking_speed_ms
    
    # Return straight-line route
    return RouteResponse(
        coordinates=[[lat1, lng1], [lat2, lng2]],
        distance=distance,
        duration=duration,
    )

