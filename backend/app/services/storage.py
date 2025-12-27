from google.cloud import storage
from typing import Optional, List, Dict, Any
from datetime import datetime
import os
import uuid
from app.core.config import settings
from app.core.logging import logger
import firebase_admin
from google.oauth2 import service_account
from google.cloud.exceptions import NotFound, Forbidden

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
            error_msg = "GCS_BUCKET_NAME not configured. Please set GCS_BUCKET_NAME in your environment variables."
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        try:
            client = get_storage_client()
            bucket = client.bucket(settings.GCS_BUCKET_NAME)
            # Try to access bucket to verify it exists and is accessible
            # Note: bucket.exists() can be slow, so we'll catch errors during actual operations instead
            return bucket
        except ValueError as e:
            # Re-raise ValueError as-is (already has good error message)
            raise
        except Exception as e:
            error_msg = f"Error accessing GCS bucket '{settings.GCS_BUCKET_NAME}': {str(e)}. Please check your bucket name, credentials, and permissions."
            logger.error(error_msg)
            raise ValueError(error_msg)
    
    @staticmethod
    def upload_file(file_content: bytes, filename: str, content_type: str = "text/plain") -> Dict[str, Any]:
        """
        Upload a file to GCS with unique filename to prevent overwrites
        
        Args:
            file_content: File content as bytes
            filename: Name of the file
            content_type: MIME type of the file
        
        Returns:
            Dict with file metadata (includes original_filename and stored_filename)
        """
        try:
            bucket = StorageService.get_bucket()
            
            # Validate file extension (only .txt allowed)
            if not filename.lower().endswith('.txt'):
                raise ValueError("Only .txt files are allowed")
            
            # Generate unique filename to prevent overwrites
            # Format: timestamp_uuid_original_filename
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            unique_id = str(uuid.uuid4())[:8]
            base_name = os.path.splitext(filename)[0]
            extension = os.path.splitext(filename)[1]
            unique_filename = f"{timestamp}_{unique_id}_{base_name}{extension}"
            
            blob = bucket.blob(f"ai-documents/{unique_filename}")
            blob.upload_from_string(file_content, content_type=content_type)
            
            # Make blob publicly readable (optional, adjust based on your needs)
            # blob.make_public()
            
            return {
                "filename": unique_filename,  # Return the unique filename
                "original_filename": filename,  # Keep original for reference
                "path": blob.name,
                "size": len(file_content),
                "content_type": content_type,
                "created_at": datetime.utcnow().isoformat(),
                "url": blob.public_url if blob.public_url else None,
            }
        except NotFound as e:
            logger.error(f"GCS bucket not found during upload: {str(e)}")
            raise ValueError(f"GCS bucket '{settings.GCS_BUCKET_NAME}' not found. Please check your bucket name.")
        except Forbidden as e:
            logger.error(f"Access forbidden to GCS bucket during upload: {str(e)}")
            raise ValueError(f"Access forbidden to GCS bucket '{settings.GCS_BUCKET_NAME}'. Please check your credentials and permissions.")
        except Exception as e:
            logger.error(f"Error uploading file to GCS: {str(e)}")
            raise
    
    @staticmethod
    def list_files() -> List[Dict[str, Any]]:
        """List all files in the ai-documents folder"""
        try:
            bucket = StorageService.get_bucket()
            blobs = bucket.list_blobs(prefix="ai-documents/")
            
            files = []
            for blob in blobs:
                if blob.name.endswith('/'):
                    continue  # Skip directories
                
                stored_filename = os.path.basename(blob.name)
                
                # Extract original filename from unique filename if possible
                # Format: timestamp_uuid_original_filename
                original_filename = stored_filename
                if '_' in stored_filename:
                    parts = stored_filename.split('_', 2)
                    if len(parts) >= 3:
                        # Reconstruct original filename (everything after timestamp_uuid_)
                        original_filename = parts[2]
                
                files.append({
                    "filename": stored_filename,
                    "original_filename": original_filename,
                    "path": blob.name,
                    "size": blob.size or 0,
                    "content_type": blob.content_type or "text/plain",
                    "created_at": blob.time_created.isoformat() if blob.time_created else None,
                    "updated_at": blob.updated.isoformat() if blob.updated else None,
                })
            
            return files
        except NotFound as e:
            logger.error(f"GCS bucket not found: {str(e)}")
            raise ValueError(f"GCS bucket '{settings.GCS_BUCKET_NAME}' not found. Please check your bucket name.")
        except Forbidden as e:
            logger.error(f"Access forbidden to GCS bucket: {str(e)}")
            raise ValueError(f"Access forbidden to GCS bucket '{settings.GCS_BUCKET_NAME}'. Please check your credentials and permissions.")
        except Exception as e:
            logger.error(f"Error listing files from GCS: {str(e)}")
            raise
    
    @staticmethod
    def get_file(filename: str) -> Optional[Dict[str, Any]]:
        """
        Get file content and metadata
        
        Args:
            filename: Name of the file (can be unique filename or original filename)
        
        Returns:
            Dict with file content and metadata, or None if not found
        """
        try:
            bucket = StorageService.get_bucket()
            blob = bucket.blob(f"ai-documents/{filename}")
            
            if not blob.exists():
                logger.warning(f"File not found: {filename}")
                return None
            
            content = blob.download_as_text()
            
            # Extract original filename from unique filename if possible
            # Format: timestamp_uuid_original_filename
            original_filename = filename
            if '_' in filename:
                parts = filename.split('_', 2)
                if len(parts) >= 3:
                    # Reconstruct original filename (everything after timestamp_uuid_)
                    original_filename = parts[2]
            
            return {
                "filename": filename,
                "original_filename": original_filename,
                "path": blob.name,
                "content": content,
                "size": blob.size or 0,
                "content_type": blob.content_type or "text/plain",
                "created_at": blob.time_created.isoformat() if blob.time_created else None,
                "updated_at": blob.updated.isoformat() if blob.updated else None,
            }
        except NotFound as e:
            logger.error(f"GCS bucket not found during get_file: {str(e)}")
            raise ValueError(f"GCS bucket '{settings.GCS_BUCKET_NAME}' not found. Please check your bucket name.")
        except Forbidden as e:
            logger.error(f"Access forbidden to GCS bucket during get_file: {str(e)}")
            raise ValueError(f"Access forbidden to GCS bucket '{settings.GCS_BUCKET_NAME}'. Please check your credentials and permissions.")
        except Exception as e:
            logger.error(f"Error getting file from GCS: {str(e)}")
            raise
    
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

