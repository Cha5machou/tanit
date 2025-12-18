from google.cloud import firestore
from typing import Optional, Dict, Any
from datetime import datetime
from app.core.logging import logger

# Initialize Firestore client
db = firestore.Client()


class FirestoreService:
    """Service for Firestore operations"""
    
    @staticmethod
    def get_user(uid: str) -> Optional[Dict[str, Any]]:
        """Get user document from Firestore"""
        try:
            doc_ref = db.collection("users").document(uid)
            doc = doc_ref.get()
            if doc.exists:
                return doc.to_dict()
            return None
        except Exception as e:
            logger.error(f"Error getting user {uid}: {e}")
            return None
    
    @staticmethod
    def create_user(uid: str, email: Optional[str] = None, role: str = "user", site_id: Optional[str] = None) -> Dict[str, Any]:
        """Create user document in Firestore"""
        try:
            user_data = {
                "role": role,
                "site_id": site_id,
                "created_at": firestore.SERVER_TIMESTAMP,
            }
            if email:
                user_data["email"] = email
            
            doc_ref = db.collection("users").document(uid)
            doc_ref.set(user_data)
            return user_data
        except Exception as e:
            logger.error(f"Error creating user {uid}: {e}")
            raise
    
    @staticmethod
    def update_user(uid: str, updates: Dict[str, Any]) -> bool:
        """Update user document"""
        try:
            doc_ref = db.collection("users").document(uid)
            doc_ref.update(updates)
            return True
        except Exception as e:
            logger.error(f"Error updating user {uid}: {e}")
            return False
    
    @staticmethod
    def get_profile(user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile"""
        try:
            doc_ref = db.collection("profiles").document(user_id)
            doc = doc_ref.get()
            if doc.exists:
                return doc.to_dict()
            return None
        except Exception as e:
            logger.error(f"Error getting profile {user_id}: {e}")
            return None
    
    @staticmethod
    def create_or_update_profile(user_id: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create or update user profile"""
        try:
            doc_ref = db.collection("profiles").document(user_id)
            doc = doc_ref.get()
            
            if doc.exists:
                # Update existing profile
                profile_data["updated_at"] = firestore.SERVER_TIMESTAMP
                doc_ref.update(profile_data)
            else:
                # Create new profile
                profile_data["user_id"] = user_id
                profile_data["created_at"] = firestore.SERVER_TIMESTAMP
                profile_data["updated_at"] = firestore.SERVER_TIMESTAMP
                doc_ref.set(profile_data)
            
            return profile_data
        except Exception as e:
            logger.error(f"Error creating/updating profile {user_id}: {e}")
            raise

