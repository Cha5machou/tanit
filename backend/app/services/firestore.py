from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta, timezone
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
    
    @staticmethod
    def log_page_visit(
        user_id: str,
        page_path: str,
        start_time: datetime,
        end_time: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Log a page visit with start and end times
        
        Args:
            user_id: User ID
            page_path: Path of the page visited (e.g., '/ai', '/admin/monitoring')
            start_time: When the user started viewing the page
            end_time: When the user left the page (None if still on page)
            metadata: Optional metadata (e.g., referrer, user_agent, etc.)
        
        Returns:
            Visit ID
        """
        try:
            db = get_db()
            visit_id = str(uuid.uuid4())
            
            # Calculate duration if end_time is provided
            duration_seconds = None
            if end_time:
                duration_seconds = (end_time - start_time).total_seconds()
            
            visit_data = {
                "user_id": user_id,
                "page_path": page_path,
                "start_time": start_time,
                "end_time": end_time,
                "duration_seconds": duration_seconds,
                "created_at": datetime.utcnow(),
            }
            if metadata:
                visit_data.update(metadata)
            
            doc_ref = db.collection("page_visits").document(visit_id)
            doc_ref.set(visit_data)
            logger.info(f"Logged page visit: {page_path} for user {user_id} (duration: {duration_seconds}s)")
            return visit_id
        except Exception as e:
            logger.error(f"Error logging page visit: {e}")
            raise
    
    @staticmethod
    def update_page_visit_end_time(visit_id: str, end_time: datetime):
        """
        Update the end_time of a page visit (when user leaves the page)
        
        Args:
            visit_id: Visit ID returned from log_page_visit
            end_time: When the user left the page
        """
        try:
            db = get_db()
            doc_ref = db.collection("page_visits").document(visit_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                logger.warning(f"Page visit {visit_id} not found for update")
                return
            
            data = doc.to_dict()
            start_time = data.get("start_time")
            
            # Convert start_time to datetime, ensuring it's timezone-aware (UTC)
            if isinstance(start_time, str):
                try:
                    start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                    # Ensure it's timezone-aware
                    if start_time.tzinfo is None:
                        start_time = start_time.replace(tzinfo=timezone.utc)
                except:
                    start_time = datetime.now(timezone.utc)
            elif hasattr(start_time, 'timestamp'):
                # Firestore Timestamp object
                start_time = datetime.fromtimestamp(start_time.timestamp(), tz=timezone.utc)
            elif isinstance(start_time, datetime):
                # Already a datetime object
                if start_time.tzinfo is None:
                    # Make it timezone-aware (UTC)
                    start_time = start_time.replace(tzinfo=timezone.utc)
            else:
                start_time = datetime.now(timezone.utc)
            
            # Ensure end_time is also timezone-aware (UTC)
            if end_time.tzinfo is None:
                end_time = end_time.replace(tzinfo=timezone.utc)
            
            duration_seconds = (end_time - start_time).total_seconds()
            
            # Ensure duration is positive
            if duration_seconds < 0:
                logger.warning(f"Negative duration calculated for visit {visit_id}, using 0")
                duration_seconds = 0
            
            update_data = {
                "end_time": end_time,
                "duration_seconds": duration_seconds,
                "updated_at": firestore.SERVER_TIMESTAMP,
            }
            
            logger.info(f"Updating page visit {visit_id} with end_time={end_time.isoformat()}, duration_seconds={duration_seconds}")
            doc_ref.update(update_data)
            logger.info(f"Successfully updated page visit {visit_id} end_time (duration: {duration_seconds}s)")
        except Exception as e:
            logger.error(f"Error updating page visit end_time: {e}")
            raise
    
    @staticmethod
    def get_page_visits(
        user_id: Optional[str] = None,
        page_path: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Get page visits with optional filters
        
        Args:
            user_id: Filter by user ID
            page_path: Filter by page path
            start_time: Filter visits that started after this time
            end_time: Filter visits that started before this time
        
        Returns:
            List of page visits
        """
        try:
            db = get_db()
            visits_ref = db.collection("page_visits")
            query = visits_ref
            
            # Apply filters
            if user_id:
                query = query.where(filter=FieldFilter("user_id", "==", user_id))
            if page_path:
                query = query.where(filter=FieldFilter("page_path", "==", page_path))
            if start_time:
                query = query.where(filter=FieldFilter("start_time", ">=", start_time))
            if end_time:
                query = query.where(filter=FieldFilter("start_time", "<=", end_time))
            
            # Order by start_time descending
            docs = query.order_by("start_time", direction=firestore.Query.DESCENDING).stream()
            
            visits = []
            for doc in docs:
                data = doc.to_dict()
                # Convert Firestore timestamps to datetime if needed
                start_time_visit = data.get("start_time")
                end_time_visit = data.get("end_time")
                
                if hasattr(start_time_visit, 'timestamp'):
                    start_time_visit = datetime.fromtimestamp(start_time_visit.timestamp())
                elif isinstance(start_time_visit, str):
                    try:
                        start_time_visit = datetime.fromisoformat(start_time_visit.replace('Z', '+00:00'))
                    except:
                        start_time_visit = datetime.utcnow()
                elif not isinstance(start_time_visit, datetime):
                    start_time_visit = datetime.utcnow()
                
                if end_time_visit:
                    if hasattr(end_time_visit, 'timestamp'):
                        end_time_visit = datetime.fromtimestamp(end_time_visit.timestamp())
                    elif isinstance(end_time_visit, str):
                        try:
                            end_time_visit = datetime.fromisoformat(end_time_visit.replace('Z', '+00:00'))
                        except:
                            end_time_visit = None
                    elif not isinstance(end_time_visit, datetime):
                        end_time_visit = None
                
                visits.append({
                    "visit_id": doc.id,
                    "user_id": data.get("user_id"),
                    "page_path": data.get("page_path"),
                    "start_time": start_time_visit,
                    "end_time": end_time_visit,
                    "duration_seconds": data.get("duration_seconds"),
                    **{k: v for k, v in data.items() if k not in ["user_id", "page_path", "start_time", "end_time", "duration_seconds"]}
                })
            
            return visits
        except Exception as e:
            logger.error(f"Error getting page visits: {e}")
            return []
    
    # Removed log_analytics_event - now using page_visits collection only
    # Analytics events are logged as special page visits with event_type in metadata
    
    @staticmethod
    def log_ai_event(
        event_type: str,
        user_id: str,
        conversation_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Log an AI-related event (ai_request, embedding_request)
        
        Args:
            event_type: Type of event ('ai_request', 'embedding_request')
            user_id: User ID
            conversation_id: Conversation ID (for ai_request)
            metadata: Event-specific metadata (model, tokens, cost, latency, etc.)
        
        Returns:
            Event ID
        """
        try:
            db = get_db()
            event_id = str(uuid.uuid4())
            event_data = {
                "event_type": event_type,
                "user_id": user_id,
                "conversation_id": conversation_id,
                "timestamp": firestore.SERVER_TIMESTAMP,
                "created_at": datetime.utcnow(),
            }
            if metadata:
                event_data.update(metadata)
            
            doc_ref = db.collection("ai_events").document(event_id)
            doc_ref.set(event_data)
            logger.debug(f"Logged AI event: {event_type} for user {user_id}")
            return event_id
        except Exception as e:
            logger.error(f"Error logging AI event: {e}")
            raise
    
    # Removed get_analytics_events - now using page_visits collection only
    # To get analytics events, query page_visits with event_type filter in metadata
    
    @staticmethod
    def get_ai_events(
        event_type: Optional[str] = None,
        user_id: Optional[str] = None,
        conversation_id: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Get AI events with optional filters
        Note: When filtering by event_type, we fetch all events and filter in memory
        to avoid requiring a composite index in Firestore.
        """
        try:
            db = get_db()
            events_ref = db.collection("ai_events")
            query = events_ref
            
            # If we have event_type filter, we'll filter in memory to avoid index requirement
            # Otherwise, we can use Firestore queries directly
            needs_memory_filter = event_type is not None
            
            if not needs_memory_filter:
                # No event_type filter, we can use Firestore queries directly
                if user_id:
                    query = query.where(filter=FieldFilter("user_id", "==", user_id))
                if conversation_id:
                    query = query.where(filter=FieldFilter("conversation_id", "==", conversation_id))
                if start_time:
                    query = query.where(filter=FieldFilter("created_at", ">=", start_time))
                if end_time:
                    query = query.where(filter=FieldFilter("created_at", "<=", end_time))
                
                # Only order_by if we don't have complex filters that require index
                if not (start_time or end_time):
                    docs = query.order_by("created_at", direction=firestore.Query.DESCENDING).stream()
                else:
                    docs = query.stream()
            else:
                # We have event_type filter, fetch all and filter in memory
                docs = query.stream()
            
            events = []
            for doc in docs:
                data = doc.to_dict()
                
                # Filter by event_type in memory if needed
                if needs_memory_filter and data.get("event_type") != event_type:
                    continue
                
                # Filter by other fields in memory if event_type filter is active
                if needs_memory_filter:
                    if user_id and data.get("user_id") != user_id:
                        continue
                    if conversation_id and data.get("conversation_id") != conversation_id:
                        continue
                
                created_at = data.get("created_at")
                if hasattr(created_at, 'timestamp'):
                    created_at = datetime.fromtimestamp(created_at.timestamp())
                elif isinstance(created_at, str):
                    try:
                        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    except:
                        created_at = datetime.utcnow()
                elif not isinstance(created_at, datetime):
                    created_at = datetime.utcnow()
                
                # Filter by time range in memory if event_type filter is active
                if needs_memory_filter:
                    if start_time and created_at < start_time:
                        continue
                    if end_time and created_at > end_time:
                        continue
                
                events.append({
                    "event_id": doc.id,
                    "event_type": data.get("event_type"),
                    "user_id": data.get("user_id"),
                    "conversation_id": data.get("conversation_id"),
                    "created_at": created_at,
                    **{k: v for k, v in data.items() if k not in ["event_type", "user_id", "conversation_id", "created_at", "timestamp"]}
                })
            
            # Sort by created_at descending if we filtered in memory
            if needs_memory_filter:
                events.sort(key=lambda x: x.get("created_at", datetime.min), reverse=True)
            
            return events
        except Exception as e:
            logger.error(f"Error getting AI events: {e}")
            return []
    
    @staticmethod
    def close_inactive_page_visits(inactivity_minutes: int = 30) -> int:
        """
        Close page visits that have end_time == None
        Sets end_time = start_time + 30 minutes
        
        Args:
            inactivity_minutes: Minutes to add to start_time for end_time (default: 30)
        
        Returns:
            Number of visits closed
        """
        try:
            db = get_db()
            
            # Get all page visits without end_time
            visits_ref = db.collection("page_visits")
            query = visits_ref.where(filter=FieldFilter("end_time", "==", None))
            
            docs = query.stream()
            
            closed_count = 0
            for doc in docs:
                data = doc.to_dict()
                start_time = data.get("start_time")
                
                if not start_time:
                    continue
                
                # Convert start_time to datetime, ensuring it's timezone-aware
                if isinstance(start_time, str):
                    try:
                        start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                        if start_time.tzinfo is None:
                            start_time = start_time.replace(tzinfo=timezone.utc)
                    except:
                        continue
                elif hasattr(start_time, 'timestamp'):
                    start_time = datetime.fromtimestamp(start_time.timestamp(), tz=timezone.utc)
                elif isinstance(start_time, datetime):
                    if start_time.tzinfo is None:
                        start_time = start_time.replace(tzinfo=timezone.utc)
                else:
                    continue
                
                # Set end_time = start_time + inactivity_minutes
                end_time = start_time + timedelta(minutes=inactivity_minutes)
                duration_seconds = (end_time - start_time).total_seconds()
                
                doc_ref = db.collection("page_visits").document(doc.id)
                doc_ref.update({
                    "end_time": end_time,
                    "duration_seconds": duration_seconds,
                    "updated_at": firestore.SERVER_TIMESTAMP,
                })
                closed_count += 1
                logger.info(f"Closed page visit {doc.id} (end_time = start_time + {inactivity_minutes} minutes)")
            
            return closed_count
        except Exception as e:
            logger.error(f"Error closing inactive page visits: {e}")
            raise
    
    @staticmethod
    def create_poi(poi_data: Dict[str, Any]) -> str:
        """Create a new POI"""
        try:
            db = get_db()
            poi_data["created_at"] = firestore.SERVER_TIMESTAMP
            poi_data["updated_at"] = firestore.SERVER_TIMESTAMP
            
            doc_ref = db.collection("poi").document()
            doc_ref.set(poi_data)
            return doc_ref.id
        except Exception as e:
            logger.error(f"Error creating POI: {e}")
            raise
    
    @staticmethod
    def get_poi(poi_id: str) -> Optional[Dict[str, Any]]:
        """Get a POI by ID"""
        try:
            db = get_db()
            doc_ref = db.collection("poi").document(poi_id)
            doc = doc_ref.get()
            if doc.exists:
                data = doc.to_dict()
                data["poi_id"] = doc.id
                return data
            return None
        except Exception as e:
            logger.error(f"Error getting POI {poi_id}: {e}")
            return None
    
    @staticmethod
    def list_pois() -> List[Dict[str, Any]]:
        """List all POIs"""
        try:
            db = get_db()
            pois_ref = db.collection("poi")
            docs = pois_ref.stream()
            
            pois = []
            for doc in docs:
                data = doc.to_dict()
                data["poi_id"] = doc.id
                pois.append(data)
            
            return pois
        except Exception as e:
            logger.error(f"Error listing POIs: {e}")
            return []
    
    @staticmethod
    def update_poi(poi_id: str, updates: Dict[str, Any]) -> bool:
        """Update a POI"""
        try:
            db = get_db()
            updates["updated_at"] = firestore.SERVER_TIMESTAMP
            doc_ref = db.collection("poi").document(poi_id)
            doc_ref.update(updates)
            return True
        except Exception as e:
            logger.error(f"Error updating POI {poi_id}: {e}")
            return False
    
    @staticmethod
    def delete_poi(poi_id: str) -> bool:
        """Delete a POI"""
        try:
            db = get_db()
            doc_ref = db.collection("poi").document(poi_id)
            doc_ref.delete()
            return True
        except Exception as e:
            logger.error(f"Error deleting POI {poi_id}: {e}")
            return False
    
    # Ads (Advertisements) methods
    @staticmethod
    def create_ad(ad_data: Dict[str, Any]) -> str:
        """Create a new ad"""
        try:
            db = get_db()
            ad_data["created_at"] = firestore.SERVER_TIMESTAMP
            ad_data["updated_at"] = firestore.SERVER_TIMESTAMP
            
            doc_ref = db.collection("ads").document()
            doc_ref.set(ad_data)
            return doc_ref.id
        except Exception as e:
            logger.error(f"Error creating ad: {e}")
            raise
    
    @staticmethod
    def get_ad(ad_id: str) -> Optional[Dict[str, Any]]:
        """Get an ad by ID"""
        try:
            db = get_db()
            doc_ref = db.collection("ads").document(ad_id)
            doc = doc_ref.get()
            if doc.exists:
                data = doc.to_dict()
                data["ad_id"] = doc.id
                return data
            return None
        except Exception as e:
            logger.error(f"Error getting ad {ad_id}: {e}")
            return None
    
    @staticmethod
    def list_ads(position: Optional[str] = None, active_only: bool = False) -> List[Dict[str, Any]]:
        """List all ads, optionally filtered by position and active status"""
        try:
            db = get_db()
            ads_ref = db.collection("ads")
            
            # Apply filters
            if position:
                ads_ref = ads_ref.where("position", "==", position)
            if active_only:
                ads_ref = ads_ref.where("active", "==", True)
            
            docs = ads_ref.stream()
            
            ads = []
            for doc in docs:
                data = doc.to_dict()
                data["ad_id"] = doc.id
                ads.append(data)
            
            # Sort by position and slot
            ads.sort(key=lambda x: (x.get("position", ""), x.get("slot", 0)))
            
            return ads
        except Exception as e:
            logger.error(f"Error listing ads: {e}")
            return []
    
    @staticmethod
    def update_ad(ad_id: str, updates: Dict[str, Any]) -> bool:
        """Update an ad"""
        try:
            db = get_db()
            updates["updated_at"] = firestore.SERVER_TIMESTAMP
            doc_ref = db.collection("ads").document(ad_id)
            doc_ref.update(updates)
            return True
        except Exception as e:
            logger.error(f"Error updating ad {ad_id}: {e}")
            return False
    
    @staticmethod
    def delete_ad(ad_id: str) -> bool:
        """Delete an ad"""
        try:
            db = get_db()
            doc_ref = db.collection("ads").document(ad_id)
            doc_ref.delete()
            return True
        except Exception as e:
            logger.error(f"Error deleting ad {ad_id}: {e}")
            return False
    
    # Quiz Questions methods
    @staticmethod
    def create_quiz_question(question_data: Dict[str, Any]) -> str:
        """Create a new quiz question"""
        try:
            db = get_db()
            question_id = str(uuid.uuid4())
            question_data["question_id"] = question_id
            question_data["created_at"] = firestore.SERVER_TIMESTAMP
            question_data["updated_at"] = firestore.SERVER_TIMESTAMP
            doc_ref = db.collection("quiz_questions").document(question_id)
            doc_ref.set(question_data)
            return question_id
        except Exception as e:
            logger.error(f"Error creating quiz question: {e}")
            raise
    
    @staticmethod
    def get_quiz_question(question_id: str) -> Optional[Dict[str, Any]]:
        """Get a quiz question by ID"""
        try:
            db = get_db()
            doc_ref = db.collection("quiz_questions").document(question_id)
            doc = doc_ref.get()
            if doc.exists:
                return doc.to_dict()
            return None
        except Exception as e:
            logger.error(f"Error getting quiz question {question_id}: {e}")
            return None
    
    @staticmethod
    def list_quiz_questions(active_only: bool = False) -> List[Dict[str, Any]]:
        """List all quiz questions"""
        try:
            db = get_db()
            query = db.collection("quiz_questions")
            if active_only:
                query = query.where("is_active", "==", True)
            docs = query.stream()
            return [doc.to_dict() for doc in docs]
        except Exception as e:
            logger.error(f"Error listing quiz questions: {e}")
            return []
    
    @staticmethod
    def update_quiz_question(question_id: str, updates: Dict[str, Any]) -> bool:
        """Update a quiz question"""
        try:
            db = get_db()
            updates["updated_at"] = firestore.SERVER_TIMESTAMP
            doc_ref = db.collection("quiz_questions").document(question_id)
            doc_ref.update(updates)
            return True
        except Exception as e:
            logger.error(f"Error updating quiz question {question_id}: {e}")
            return False
    
    @staticmethod
    def delete_quiz_question(question_id: str) -> bool:
        """Delete a quiz question"""
        try:
            db = get_db()
            doc_ref = db.collection("quiz_questions").document(question_id)
            doc_ref.delete()
            return True
        except Exception as e:
            logger.error(f"Error deleting quiz question {question_id}: {e}")
            return False
    
    # Quiz Submissions methods
    @staticmethod
    def create_quiz_submission(submission_data: Dict[str, Any]) -> str:
        """Create a new quiz submission"""
        try:
            db = get_db()
            submission_id = str(uuid.uuid4())
            submission_data["submission_id"] = submission_id
            submission_data["submitted_at"] = firestore.SERVER_TIMESTAMP
            doc_ref = db.collection("quiz_submissions").document(submission_id)
            doc_ref.set(submission_data)
            return submission_id
        except Exception as e:
            logger.error(f"Error creating quiz submission: {e}")
            raise
    
    @staticmethod
    def get_user_quiz_submission_today(user_id: str) -> Optional[Dict[str, Any]]:
        """Check if user has already taken a quiz today"""
        try:
            db = get_db()
            today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            today_end = today_start + timedelta(days=1)
            
            query = db.collection("quiz_submissions").where("user_id", "==", user_id).where("submitted_at", ">=", today_start).where("submitted_at", "<", today_end).limit(1)
            docs = list(query.stream())
            if docs:
                return docs[0].to_dict()
            return None
        except Exception as e:
            logger.error(f"Error checking user quiz submission today: {e}")
            return None
    
    @staticmethod
    def get_quiz_submission(submission_id: str) -> Optional[Dict[str, Any]]:
        """Get a quiz submission by ID"""
        try:
            db = get_db()
            doc_ref = db.collection("quiz_submissions").document(submission_id)
            doc = doc_ref.get()
            if doc.exists:
                return doc.to_dict()
            return None
        except Exception as e:
            logger.error(f"Error getting quiz submission {submission_id}: {e}")
            return None
    
    @staticmethod
    def list_quiz_submissions(user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """List quiz submissions, optionally filtered by user"""
        try:
            db = get_db()
            query = db.collection("quiz_submissions")
            if user_id:
                query = query.where("user_id", "==", user_id)
            docs = query.order_by("submitted_at", direction=firestore.Query.DESCENDING).stream()
            return [doc.to_dict() for doc in docs]
        except Exception as e:
            logger.error(f"Error listing quiz submissions: {e}")
            return []

