from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from app.api.deps import get_admin_user, get_current_user
from app.services.firestore import FirestoreService
from app.services.storage import StorageService
from app.schemas.ads import AdCreate, AdUpdate, AdResponse
from typing import Dict, Any, List, Optional
from datetime import datetime

router = APIRouter()


@router.post("/ads", response_model=AdResponse, status_code=status.HTTP_201_CREATED)
async def create_ad(
    name: str = Form(...),
    description: str = Form(...),
    link: str = Form(...),
    position: str = Form(...),
    slot: int = Form(...),
    active: bool = Form(default=True),
    logo: Optional[UploadFile] = File(None),
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Create a new ad with optional logo upload
    """
    try:
        # Validate position
        if position not in ["left", "right"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Position must be 'left' or 'right'"
            )
        
        # Validate slot
        if slot < 1 or slot > 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Slot must be between 1 and 5"
            )
        
        logo_url = None
        
        # Upload logo if provided
        if logo:
            if not logo.content_type.startswith('image/'):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Logo must be an image file"
                )
            logo_url = StorageService.upload_poi_file(
                file_content=await logo.read(),
                filename=logo.filename or "logo.jpg",
                content_type=logo.content_type
            )
        
        # Create ad in Firestore
        ad_data = {
            "name": name,
            "description": description,
            "logo_url": logo_url,
            "link": link,
            "position": position,
            "slot": slot,
            "active": active,
        }
        
        ad_id = FirestoreService.create_ad(ad_data)
        ad = FirestoreService.get_ad(ad_id)
        
        if not ad:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve created ad"
            )
        
        # Convert Firestore timestamps to datetime
        created_at = ad.get("created_at")
        updated_at = ad.get("updated_at")
        
        if hasattr(created_at, 'timestamp'):
            created_at = datetime.fromtimestamp(created_at.timestamp())
        if hasattr(updated_at, 'timestamp'):
            updated_at = datetime.fromtimestamp(updated_at.timestamp())
        
        return AdResponse(
            ad_id=ad["ad_id"],
            name=ad["name"],
            description=ad["description"],
            logo_url=ad.get("logo_url"),
            link=ad["link"],
            position=ad["position"],
            slot=ad["slot"],
            active=ad.get("active", True),
            created_at=created_at,
            updated_at=updated_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating ad: {str(e)}"
        )


@router.get("/ads", response_model=List[AdResponse])
async def list_ads(
    position: Optional[str] = None,
    active_only: bool = False,
):
    """
    List all ads, optionally filtered by position and active status.
    Public endpoint - no authentication required.
    """
    try:
        ads = FirestoreService.list_ads(position=position, active_only=active_only)
        
        result = []
        for ad in ads:
            created_at = ad.get("created_at")
            updated_at = ad.get("updated_at")
            
            if hasattr(created_at, 'timestamp'):
                created_at = datetime.fromtimestamp(created_at.timestamp())
            if hasattr(updated_at, 'timestamp'):
                updated_at = datetime.fromtimestamp(updated_at.timestamp())
            
            result.append(AdResponse(
                ad_id=ad["ad_id"],
                name=ad["name"],
                description=ad["description"],
                logo_url=ad.get("logo_url"),
                link=ad["link"],
                position=ad["position"],
                slot=ad["slot"],
                active=ad.get("active", True),
                created_at=created_at,
                updated_at=updated_at,
            ))
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing ads: {str(e)}"
        )


@router.get("/ads/{ad_id}", response_model=AdResponse)
async def get_ad(
    ad_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get a specific ad by ID
    """
    try:
        ad = FirestoreService.get_ad(ad_id)
        
        if not ad:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ad not found"
            )
        
        created_at = ad.get("created_at")
        updated_at = ad.get("updated_at")
        
        if hasattr(created_at, 'timestamp'):
            created_at = datetime.fromtimestamp(created_at.timestamp())
        if hasattr(updated_at, 'timestamp'):
            updated_at = datetime.fromtimestamp(updated_at.timestamp())
        
        return AdResponse(
            ad_id=ad["ad_id"],
            name=ad["name"],
            description=ad["description"],
            logo_url=ad.get("logo_url"),
            link=ad["link"],
            position=ad["position"],
            slot=ad["slot"],
            active=ad.get("active", True),
            created_at=created_at,
            updated_at=updated_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting ad: {str(e)}"
        )


@router.put("/ads/{ad_id}", response_model=AdResponse)
async def update_ad(
    ad_id: str,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    link: Optional[str] = Form(None),
    position: Optional[str] = Form(None),
    slot: Optional[int] = Form(None),
    active: Optional[bool] = Form(None),
    logo: Optional[UploadFile] = File(None),
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Update an ad
    """
    try:
        ad = FirestoreService.get_ad(ad_id)
        
        if not ad:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ad not found"
            )
        
        updates = {}
        
        if name is not None:
            updates["name"] = name
        if description is not None:
            updates["description"] = description
        if link is not None:
            updates["link"] = link
        if position is not None:
            if position not in ["left", "right"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Position must be 'left' or 'right'"
                )
            updates["position"] = position
        if slot is not None:
            if slot < 1 or slot > 5:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Slot must be between 1 and 5"
                )
            updates["slot"] = slot
        if active is not None:
            updates["active"] = active
        
        # Upload new logo if provided
        if logo:
            if not logo.content_type.startswith('image/'):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Logo must be an image file"
                )
            logo_url = StorageService.upload_poi_file(
                file_content=await logo.read(),
                filename=logo.filename or "logo.jpg",
                content_type=logo.content_type
            )
            updates["logo_url"] = logo_url
        
        if updates:
            FirestoreService.update_ad(ad_id, updates)
        
        # Get updated ad
        updated_ad = FirestoreService.get_ad(ad_id)
        
        created_at = updated_ad.get("created_at")
        updated_at = updated_ad.get("updated_at")
        
        if hasattr(created_at, 'timestamp'):
            created_at = datetime.fromtimestamp(created_at.timestamp())
        if hasattr(updated_at, 'timestamp'):
            updated_at = datetime.fromtimestamp(updated_at.timestamp())
        
        return AdResponse(
            ad_id=updated_ad["ad_id"],
            name=updated_ad["name"],
            description=updated_ad["description"],
            logo_url=updated_ad.get("logo_url"),
            link=updated_ad["link"],
            position=updated_ad["position"],
            slot=updated_ad["slot"],
            active=updated_ad.get("active", True),
            created_at=created_at,
            updated_at=updated_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating ad: {str(e)}"
        )


@router.delete("/ads/{ad_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ad(
    ad_id: str,
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Delete an ad
    """
    try:
        success = FirestoreService.delete_ad(ad_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ad not found"
            )
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting ad: {str(e)}"
        )

