from google.cloud import storage
from typing import Optional, List, Dict, Any
from datetime import datetime
import os
from app.core.config import settings
from app.core.logging import logger
import firebase_admin
from google.oauth2 import service_account

# Lazy initialization of Storage client
_storage_client = None

def get_storage_client():
    """Get Google Cloud Storage client with proper credentials"""
    global _storage_client
    if _storage_client is not None:
        return _storage_client
    
    # Ensure Firebase Admin is initialized
    if not firebase_admin._apps:
        from app.core.security import init_firebase
        init_firebase()
    
    # Get credentials
    if settings.FIREBASE_SERVICE_ACCOUNT_PATH:
        credentials = service_account.Credentials.from_service_account_file(
            settings.FIREBASE_SERVICE_ACCOUNT_PATH
        )
    elif settings.FIREBASE_PRIVATE_KEY:
        service_account_info = {
            "type": "service_account",
            "project_id": settings.FIREBASE_PROJECT_ID,
            "private_key_id": settings.FIREBASE_PRIVATE_KEY_ID,
            "private_key": settings.FIREBASE_PRIVATE_KEY.replace("\\n", "\n"),
            "client_email": settings.FIREBASE_CLIENT_EMAIL,
            "client_id": settings.FIREBASE_CLIENT_ID,
            "auth_uri": settings.FIREBASE_AUTH_URI,
            "token_uri": settings.FIREBASE_TOKEN_URI,
        }
        credentials = service_account.Credentials.from_service_account_info(
            service_account_info
        )
    else:
        raise ValueError("Firebase credentials not configured")
    
    _storage_client = storage.Client(
        project=settings.FIREBASE_PROJECT_ID,
        credentials=credentials
    )
    return _storage_client


class StorageService:
    """Service for managing files in Google Cloud Storage"""
    
    @staticmethod
    def get_bucket():
        """Get the GCS bucket"""
        if not settings.GCS_BUCKET_NAME:
            raise ValueError("GCS_BUCKET_NAME not configured")
        
        client = get_storage_client()
        bucket = client.bucket(settings.GCS_BUCKET_NAME)
        return bucket
    
    @staticmethod
    def upload_file(file_content: bytes, filename: str, content_type: str = "text/plain") -> Dict[str, Any]:
        """
        Upload a file to GCS
        
        Args:
            file_content: File content as bytes
            filename: Name of the file
            content_type: MIME type of the file
        
        Returns:
            Dict with file metadata
        """
        bucket = StorageService.get_bucket()
        
        # Validate file extension (only .txt allowed)
        if not filename.lower().endswith('.txt'):
            raise ValueError("Only .txt files are allowed")
        
        blob = bucket.blob(f"ai-documents/{filename}")
        blob.upload_from_string(file_content, content_type=content_type)
        
        # Make blob publicly readable (optional, adjust based on your needs)
        # blob.make_public()
        
        return {
            "filename": filename,
            "path": blob.name,
            "size": len(file_content),
            "content_type": content_type,
            "created_at": datetime.utcnow().isoformat(),
            "url": blob.public_url if blob.public_url else None,
        }
    
    @staticmethod
    def list_files() -> List[Dict[str, Any]]:
        """List all files in the ai-documents folder"""
        bucket = StorageService.get_bucket()
        blobs = bucket.list_blobs(prefix="ai-documents/")
        
        files = []
        for blob in blobs:
            if blob.name.endswith('/'):
                continue  # Skip directories
            
            files.append({
                "filename": os.path.basename(blob.name),
                "path": blob.name,
                "size": blob.size,
                "content_type": blob.content_type,
                "created_at": blob.time_created.isoformat() if blob.time_created else None,
                "updated_at": blob.updated.isoformat() if blob.updated else None,
            })
        
        return files
    
    @staticmethod
    def get_file(filename: str) -> Optional[Dict[str, Any]]:
        """
        Get file content and metadata
        
        Args:
            filename: Name of the file
        
        Returns:
            Dict with file content and metadata, or None if not found
        """
        bucket = StorageService.get_bucket()
        blob = bucket.blob(f"ai-documents/{filename}")
        
        if not blob.exists():
            return None
        
        content = blob.download_as_text()
        
        return {
            "filename": filename,
            "path": blob.name,
            "content": content,
            "size": blob.size,
            "content_type": blob.content_type,
            "created_at": blob.time_created.isoformat() if blob.time_created else None,
            "updated_at": blob.updated.isoformat() if blob.updated else None,
        }
    
    @staticmethod
    def delete_file(filename: str) -> bool:
        """
        Delete a file from GCS
        
        Args:
            filename: Name of the file
        
        Returns:
            True if deleted, False if not found
        """
        bucket = StorageService.get_bucket()
        blob = bucket.blob(f"ai-documents/{filename}")
        
        if not blob.exists():
            return False
        
        blob.delete()
        return True
    
    @staticmethod
    def replace_file(file_content: bytes, filename: str, content_type: str = "text/plain") -> Dict[str, Any]:
        """
        Replace an existing file in GCS
        
        Args:
            file_content: File content as bytes
            filename: Name of the file
            content_type: MIME type of the file
        
        Returns:
            Dict with file metadata
        """
        # Delete old file if exists
        StorageService.delete_file(filename)
        
        # Upload new file
        return StorageService.upload_file(file_content, filename, content_type)

