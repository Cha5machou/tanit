from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from typing import Optional, Dict, Any, List
from datetime import datetime
from app.core.logging import logger
from app.core.config import settings
import firebase_admin
from google.oauth2 import service_account
import uuid

# Lazy initialization of Firestore client
_db = None

def get_db():
    """Get Firestore client with proper credentials (lazy initialization)"""
    global _db
    if _db is not None:
        return _db
    
    # Ensure Firebase Admin is initialized
    if not firebase_admin._apps:
        from app.core.security import init_firebase
        init_firebase()
    
    # Get the project ID from settings
    project_id = settings.FIREBASE_PROJECT_ID
    if not project_id:
        raise ValueError("FIREBASE_PROJECT_ID not configured. Please check your .env file.")
    
    # Create credentials compatible with google-auth-library-python
    # Use the same credentials as Firebase Admin but create service account credentials
    if settings.FIREBASE_SERVICE_ACCOUNT_PATH:
        # Use service account file if available
        credentials = service_account.Credentials.from_service_account_file(
            settings.FIREBASE_SERVICE_ACCOUNT_PATH
        )
    elif settings.FIREBASE_PRIVATE_KEY:
        # Create credentials from environment variables
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
        raise ValueError("Firebase credentials not configured. Please check your .env file.")
    
    # Create Firestore client with explicit credentials
    _db = firestore.Client(project=project_id, credentials=credentials)
    return _db


class FirestoreService:
    """Service for Firestore operations"""
    
    @staticmethod
    def get_user(uid: str) -> Optional[Dict[str, Any]]:
        """Get user document from Firestore"""
        try:
            db = get_db()
            doc_ref = db.collection("users").document(uid)
            doc = doc_ref.get()
            if doc.exists:
                return doc.to_dict()
            return None
        except Exception as e:
            logger.error(f"Error getting user {uid}: {e}")
            return None
    
    @staticmethod
    def create_user(uid: str, email: Optional[str] = None, role: str = "user") -> Dict[str, Any]:
        """Create user document in Firestore"""
        try:
            db = get_db()
            user_data = {
                "role": role,
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
            db = get_db()
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
            db = get_db()
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
            db = get_db()
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
    
    @staticmethod
    def create_conversation(user_id: str, title: Optional[str] = None) -> str:
        """Create a new conversation"""
        try:
            db = get_db()
            conversation_id = str(uuid.uuid4())
            conversation_data = {
                "user_id": user_id,
                "title": title or "New Conversation",
                "messages": [],
                "created_at": firestore.SERVER_TIMESTAMP,
                "updated_at": firestore.SERVER_TIMESTAMP,
            }
            doc_ref = db.collection("conversations").document(conversation_id)
            doc_ref.set(conversation_data)
            return conversation_id
        except Exception as e:
            logger.error(f"Error creating conversation: {e}")
            raise
    
    @staticmethod
    def add_message_to_conversation(conversation_id: str, role: str, content: str):
        """Add a message to a conversation"""
        try:
            db = get_db()
            doc_ref = db.collection("conversations").document(conversation_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                raise ValueError(f"Conversation {conversation_id} not found")
            
            # Use datetime.utcnow() for message timestamp since SERVER_TIMESTAMP
            # cannot be used inside ArrayUnion
            message = {
                "role": role,
                "content": content,
                "timestamp": datetime.utcnow(),
            }
            
            doc_ref.update({
                "messages": firestore.ArrayUnion([message]),
                "updated_at": firestore.SERVER_TIMESTAMP,
            })
        except Exception as e:
            logger.error(f"Error adding message to conversation: {e}")
            raise
    
    @staticmethod
    def get_conversation(conversation_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a conversation"""
        try:
            db = get_db()
            doc_ref = db.collection("conversations").document(conversation_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                return None
            
            data = doc.to_dict()
            if data.get("user_id") != user_id:
                return None  # User doesn't own this conversation
            
            return data
        except Exception as e:
            logger.error(f"Error getting conversation: {e}")
            return None
    
    @staticmethod
    def list_conversations(user_id: str) -> List[Dict[str, Any]]:
        """List all conversations for a user"""
        try:
            db = get_db()
            conversations_ref = db.collection("conversations")
            # Filter by user_id only (no order_by to avoid index requirement)
            # Use FieldFilter to avoid deprecation warning
            query = conversations_ref.where(filter=FieldFilter("user_id", "==", user_id))
            docs = query.stream()
            
            conversations = []
            for doc in docs:
                data = doc.to_dict()
                messages = data.get("messages", [])
                
                # Get title: use first user message if available, otherwise use stored title
                title = data.get("title", "Untitled")
                if messages:
                    # Find first user message
                    first_user_msg = next((msg for msg in messages if msg.get("role") == "user"), None)
                    if first_user_msg:
                        title = first_user_msg.get("content", title)[:50]  # First 50 chars of first question
                
                # Convert Firestore timestamps to datetime if needed
                updated_at = data.get("updated_at")
                created_at = data.get("created_at")
                
                # Handle Firestore Timestamp objects
                if hasattr(updated_at, 'timestamp'):
                    updated_at = datetime.fromtimestamp(updated_at.timestamp())
                elif isinstance(updated_at, datetime):
                    pass  # Already a datetime
                else:
                    updated_at = datetime.utcnow()  # Fallback
                
                if hasattr(created_at, 'timestamp'):
                    created_at = datetime.fromtimestamp(created_at.timestamp())
                elif isinstance(created_at, datetime):
                    pass  # Already a datetime
                else:
                    created_at = datetime.utcnow()  # Fallback
                
                conversations.append({
                    "conversation_id": doc.id,
                    "title": title,
                    "created_at": created_at,
                    "updated_at": updated_at,
                    "message_count": len(messages),
                })
            
            # Sort in Python memory by updated_at descending
            conversations.sort(key=lambda x: x["updated_at"], reverse=True)
            
            return conversations
        except Exception as e:
            logger.error(f"Error listing conversations: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return []
    
    @staticmethod
    def delete_conversation(conversation_id: str, user_id: str) -> bool:
        """Delete a conversation"""
        try:
            db = get_db()
            doc_ref = db.collection("conversations").document(conversation_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                return False
            
            data = doc.to_dict()
            if data.get("user_id") != user_id:
                return False  # User doesn't own this conversation
            
            doc_ref.delete()
            return True
        except Exception as e:
            logger.error(f"Error deleting conversation: {e}")
            return False
    
    @staticmethod
    def save_agent_config(config: Dict[str, Any]):
        """Save AI agent configuration"""
        try:
            db = get_db()
            doc_ref = db.collection("ai_config").document("current")
            config["updated_at"] = firestore.SERVER_TIMESTAMP
            doc_ref.set(config)
        except Exception as e:
            logger.error(f"Error saving agent config: {e}")
            raise
    
    @staticmethod
    def get_agent_config() -> Optional[Dict[str, Any]]:
        """Get AI agent configuration"""
        try:
            db = get_db()
            doc_ref = db.collection("ai_config").document("current")
            doc = doc_ref.get()
            
            if doc.exists:
                return doc.to_dict()
            return None
        except Exception as e:
            logger.error(f"Error getting agent config: {e}")
            return None

