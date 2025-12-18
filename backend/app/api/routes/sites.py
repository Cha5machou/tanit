from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user
from typing import Dict, Any

router = APIRouter()


@router.get("/")
async def list_sites(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    List sites (placeholder for now)
    """
    return {"sites": []}

