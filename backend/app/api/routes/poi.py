from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from app.api.deps import get_admin_user, get_current_user
from app.services.firestore import FirestoreService
from app.services.storage import StorageService
from app.schemas.poi import POICreate, POIUpdate, POIResponse
from typing import Dict, Any, List, Optional
from datetime import datetime
import uuid

router = APIRouter()


@router.post("/poi", response_model=POIResponse, status_code=status.HTTP_201_CREATED)
async def create_poi(
    name: str = Form(...),
    lat: float = Form(...),
    lng: float = Form(...),
    description: str = Form(...),
    is_ad: bool = Form(default=False),
    photo: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Create a new POI with optional photo and audio uploads
    """
    try:
        photo_url = None
        audio_url = None
        
        # Upload photo if provided
        if photo:
            if not photo.content_type.startswith('image/'):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Photo must be an image file"
                )
            photo_url = StorageService.upload_poi_file(
                file_content=await photo.read(),
                filename=photo.filename or "photo.jpg",
                content_type=photo.content_type
            )
        
        # Upload audio if provided
        if audio:
            if not audio.content_type.startswith('audio/'):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Audio must be an audio file"
                )
            audio_url = StorageService.upload_poi_file(
                file_content=await audio.read(),
                filename=audio.filename or "audio.mp3",
                content_type=audio.content_type
            )
        
        # Create POI in Firestore
        poi_data = {
            "name": name,
            "lat": lat,
            "lng": lng,
            "description": description,
            "is_ad": is_ad,
            "photo_url": photo_url,
            "audio_url": audio_url,
        }
        
        poi_id = FirestoreService.create_poi(poi_data)
        poi = FirestoreService.get_poi(poi_id)
        
        if not poi:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve created POI"
            )
        
        # Convert Firestore timestamps to datetime
        created_at = poi.get("created_at")
        updated_at = poi.get("updated_at")
        
        if hasattr(created_at, 'timestamp'):
            created_at = datetime.fromtimestamp(created_at.timestamp())
        if hasattr(updated_at, 'timestamp'):
            updated_at = datetime.fromtimestamp(updated_at.timestamp())
        
        return POIResponse(
            poi_id=poi_id,
            name=poi["name"],
            lat=poi["lat"],
            lng=poi["lng"],
            description=poi["description"],
            is_ad=poi.get("is_ad", False),
            photo_url=poi.get("photo_url"),
            audio_url=poi.get("audio_url"),
            created_at=created_at or datetime.utcnow(),
            updated_at=updated_at or datetime.utcnow(),
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating POI: {str(e)}\n{traceback.format_exc()}"
        )


@router.get("/poi", response_model=List[POIResponse])
async def list_pois(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    List all POIs with signed URLs for images and audio
    """
    try:
        pois = FirestoreService.list_pois()
        
        result = []
        for poi in pois:
            created_at = poi.get("created_at")
            updated_at = poi.get("updated_at")
            
            if hasattr(created_at, 'timestamp'):
                created_at = datetime.fromtimestamp(created_at.timestamp())
            elif isinstance(created_at, str):
                try:
                    created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                except:
                    created_at = datetime.utcnow()
            elif not isinstance(created_at, datetime):
                created_at = datetime.utcnow()
            
            if hasattr(updated_at, 'timestamp'):
                updated_at = datetime.fromtimestamp(updated_at.timestamp())
            elif isinstance(updated_at, str):
                try:
                    updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
                except:
                    updated_at = datetime.utcnow()
            elif not isinstance(updated_at, datetime):
                updated_at = datetime.utcnow()
            
            # Convert public URLs to signed URLs if they are public GCS URLs
            photo_url = poi.get("photo_url")
            audio_url = poi.get("audio_url")
            
            if photo_url and photo_url.startswith('https://storage.googleapis.com/'):
                signed_photo_url = StorageService.convert_public_url_to_signed(photo_url)
                if signed_photo_url:
                    photo_url = signed_photo_url
            
            if audio_url and audio_url.startswith('https://storage.googleapis.com/'):
                signed_audio_url = StorageService.convert_public_url_to_signed(audio_url)
                if signed_audio_url:
                    audio_url = signed_audio_url
            
            result.append(POIResponse(
                poi_id=poi["poi_id"],
                name=poi["name"],
                lat=poi["lat"],
                lng=poi["lng"],
                description=poi["description"],
                is_ad=poi.get("is_ad", False),
                photo_url=photo_url,
                audio_url=audio_url,
                created_at=created_at,
                updated_at=updated_at,
            ))
        
        return result
    except Exception as e:
        import traceback
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing POIs: {str(e)}\n{traceback.format_exc()}"
        )


@router.get("/poi/{poi_id}", response_model=POIResponse)
async def get_poi(
    poi_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get a specific POI by ID
    """
    try:
        poi = FirestoreService.get_poi(poi_id)
        
        if not poi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="POI not found"
            )
        
        created_at = poi.get("created_at")
        updated_at = poi.get("updated_at")
        
        if hasattr(created_at, 'timestamp'):
            created_at = datetime.fromtimestamp(created_at.timestamp())
        elif isinstance(created_at, str):
            try:
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            except:
                created_at = datetime.utcnow()
        elif not isinstance(created_at, datetime):
            created_at = datetime.utcnow()
        
        if hasattr(updated_at, 'timestamp'):
            updated_at = datetime.fromtimestamp(updated_at.timestamp())
        elif isinstance(updated_at, str):
            try:
                updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
            except:
                updated_at = datetime.utcnow()
        elif not isinstance(updated_at, datetime):
            updated_at = datetime.utcnow()
        
        # Convert public URLs to signed URLs if they are public GCS URLs
        photo_url = poi.get("photo_url")
        audio_url = poi.get("audio_url")
        
        if photo_url and photo_url.startswith('https://storage.googleapis.com/'):
            signed_photo_url = StorageService.convert_public_url_to_signed(photo_url)
            if signed_photo_url:
                photo_url = signed_photo_url
        
        if audio_url and audio_url.startswith('https://storage.googleapis.com/'):
            signed_audio_url = StorageService.convert_public_url_to_signed(audio_url)
            if signed_audio_url:
                audio_url = signed_audio_url
        
        return POIResponse(
            poi_id=poi_id,
            name=poi["name"],
            lat=poi["lat"],
            lng=poi["lng"],
            description=poi["description"],
            is_ad=poi.get("is_ad", False),
            photo_url=photo_url,
            audio_url=audio_url,
            created_at=created_at,
            updated_at=updated_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting POI: {str(e)}\n{traceback.format_exc()}"
        )


@router.put("/poi/{poi_id}", response_model=POIResponse)
async def update_poi(
    poi_id: str,
    name: Optional[str] = Form(None),
    lat: Optional[float] = Form(None),
    lng: Optional[float] = Form(None),
    description: Optional[str] = Form(None),
    is_ad: Optional[bool] = Form(None),
    photo: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Update a POI (admin only)
    """
    try:
        poi = FirestoreService.get_poi(poi_id)
        if not poi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="POI not found"
            )
        
        updates = {}
        
        if name is not None:
            updates["name"] = name
        if lat is not None:
            updates["lat"] = lat
        if lng is not None:
            updates["lng"] = lng
        if description is not None:
            updates["description"] = description
        if is_ad is not None:
            updates["is_ad"] = is_ad
        
        # Handle photo upload
        if photo:
            if not photo.content_type.startswith('image/'):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Photo must be an image file"
                )
            # Delete old photo if exists
            if poi.get("photo_url"):
                try:
                    StorageService.delete_file(poi["photo_url"])
                except:
                    pass  # Ignore deletion errors
            
            photo_url = StorageService.upload_poi_file(
                file_content=await photo.read(),
                filename=photo.filename or "photo.jpg",
                content_type=photo.content_type
            )
            updates["photo_url"] = photo_url
        
        # Handle audio upload
        if audio:
            if not audio.content_type.startswith('audio/'):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Audio must be an audio file"
                )
            # Delete old audio if exists
            if poi.get("audio_url"):
                try:
                    StorageService.delete_file(poi["audio_url"])
                except:
                    pass  # Ignore deletion errors
            
            audio_url = StorageService.upload_poi_file(
                file_content=await audio.read(),
                filename=audio.filename or "audio.mp3",
                content_type=audio.content_type
            )
            updates["audio_url"] = audio_url
        
        if updates:
            FirestoreService.update_poi(poi_id, updates)
        
        # Get updated POI
        updated_poi = FirestoreService.get_poi(poi_id)
        
        created_at = updated_poi.get("created_at")
        updated_at = updated_poi.get("updated_at")
        
        if hasattr(created_at, 'timestamp'):
            created_at = datetime.fromtimestamp(created_at.timestamp())
        elif isinstance(created_at, str):
            try:
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            except:
                created_at = datetime.utcnow()
        elif not isinstance(created_at, datetime):
            created_at = datetime.utcnow()
        
        if hasattr(updated_at, 'timestamp'):
            updated_at = datetime.fromtimestamp(updated_at.timestamp())
        elif isinstance(updated_at, str):
            try:
                updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
            except:
                updated_at = datetime.utcnow()
        elif not isinstance(updated_at, datetime):
            updated_at = datetime.utcnow()
        
        return POIResponse(
            poi_id=poi_id,
            name=updated_poi["name"],
            lat=updated_poi["lat"],
            lng=updated_poi["lng"],
            description=updated_poi["description"],
            is_ad=updated_poi.get("is_ad", False),
            photo_url=updated_poi.get("photo_url"),
            audio_url=updated_poi.get("audio_url"),
            created_at=created_at,
            updated_at=updated_at,
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating POI: {str(e)}\n{traceback.format_exc()}"
        )


@router.delete("/poi/{poi_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_poi(
    poi_id: str,
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Delete a POI (admin only)
    """
    try:
        poi = FirestoreService.get_poi(poi_id)
        if not poi:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="POI not found"
            )
        
        # Delete associated files
        if poi.get("photo_url"):
            try:
                StorageService.delete_file(poi["photo_url"])
            except:
                pass  # Ignore deletion errors
        
        if poi.get("audio_url"):
            try:
                StorageService.delete_file(poi["audio_url"])
            except:
                pass  # Ignore deletion errors
        
        FirestoreService.delete_poi(poi_id)
        return None
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting POI: {str(e)}\n{traceback.format_exc()}"
        )

