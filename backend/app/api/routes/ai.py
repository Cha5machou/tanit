from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response, Request
from app.api.deps import get_admin_user, get_current_user
from app.core.config import settings
from app.services.storage import StorageService
from app.services.ai_agent import AIAgentService
from app.services.firestore import FirestoreService
from app.schemas.ai import (
    FileUploadResponse,
    FileInfo,
    FileContent,
    AgentConfig,
    AgentConfigResponse,
    QueryRequest,
    QueryResponse,
    StreamChunk,
    ConversationSummary,
    Conversation,
    ConversationCreate,
    ConversationCreateResponse,
    Message,
)
from typing import Dict, Any, List
import json
import uuid
from datetime import datetime
import time
from app.core.logging import logger

router = APIRouter()


# File Management Routes (Admin only)
@router.post("/files/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Upload a .txt file to Google Cloud Storage (Admin only)
    """
    # Validate file extension
    if not file.filename.lower().endswith('.txt'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .txt files are allowed"
        )
    
    # Read file content
    content = await file.read()
    
    try:
        result = StorageService.upload_file(
            file_content=content,
            filename=file.filename,
            content_type=file.content_type or "text/plain"
        )
        return FileUploadResponse(**result)
    except Exception as e:
        import traceback
        error_detail = f"Failed to upload file: {str(e)}\n{traceback.format_exc()}"
        logger.error(error_detail)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )


@router.get("/files", response_model=List[FileInfo])
async def list_files(
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """
    List all uploaded files (Admin only)
    """
    try:
        files = StorageService.list_files()
        return [FileInfo(**f) for f in files]
    except Exception as e:
        import traceback
        error_detail = f"Error listing files: {str(e)}\n{traceback.format_exc()}"
        logger.error(error_detail)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing files: {str(e)}"
        )


@router.get("/files/{filename}", response_model=FileContent)
async def get_file(
    filename: str,
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Get file content (Admin only)
    """
    try:
        file_data = StorageService.get_file(filename)
        if not file_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        return FileContent(**file_data)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_detail = f"Error getting file: {str(e)}\n{traceback.format_exc()}"
        logger.error(error_detail)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting file: {str(e)}"
        )


@router.delete("/files/{filename}")
async def delete_file(
    filename: str,
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Delete a file (Admin only)
    """
    try:
        deleted = StorageService.delete_file(filename)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        return {"message": "File deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting file: {str(e)}"
        )


@router.put("/files/{filename}", response_model=FileUploadResponse)
async def replace_file(
    filename: str,
    file: UploadFile = File(...),
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Replace an existing file (Admin only)
    """
    # Validate file extension
    if not file.filename.lower().endswith('.txt'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .txt files are allowed"
        )
    
    # Ensure filename matches
    if file.filename != filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename mismatch"
        )
    
    # Read file content
    content = await file.read()
    
    try:
        result = StorageService.replace_file(
            file_content=content,
            filename=filename,
            content_type=file.content_type or "text/plain"
        )
        return FileUploadResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error replacing file: {str(e)}"
        )


# AI Agent Configuration Routes (Admin only)
@router.post("/config", response_model=AgentConfigResponse)
async def set_agent_config(
    config: AgentConfig,
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Set AI agent configuration (Admin only)
    """
    config_data = {
        "embedding_provider": config.embedding_provider,
        "llm_provider": config.llm_provider,
        "embedding_model": config.embedding_model,
        "llm_model": config.llm_model,
        "system_prompt": config.system_prompt,
        "chunk_size": config.chunk_size,
        "chunk_overlap": config.chunk_overlap,
    }
    FirestoreService.save_agent_config(config_data)
    
    return AgentConfigResponse(
        embedding_provider=config.embedding_provider,
        llm_provider=config.llm_provider,
        embedding_model=config.embedding_model,
        llm_model=config.llm_model,
        system_prompt=config.system_prompt,
        chunk_size=config.chunk_size,
        chunk_overlap=config.chunk_overlap,
        updated_at=datetime.utcnow().isoformat()
    )


@router.get("/config", response_model=AgentConfigResponse)
async def get_agent_config(
    current_admin: Dict[str, Any] = Depends(get_admin_user)
):
    """
    Get current AI agent configuration (Admin only)
    """
    config = FirestoreService.get_agent_config()
    if config:
        return AgentConfigResponse(
            embedding_provider=config.get("embedding_provider", "openai"),
            llm_provider=config.get("llm_provider", "openai"),
            embedding_model=config.get("embedding_model"),
            llm_model=config.get("llm_model"),
            system_prompt=config.get("system_prompt"),
            chunk_size=config.get("chunk_size", 1000),
            chunk_overlap=config.get("chunk_overlap", 200),
            updated_at=config.get("updated_at", datetime.utcnow()).isoformat() if isinstance(config.get("updated_at"), datetime) else datetime.utcnow().isoformat()
        )
    
    # Return default config
    return AgentConfigResponse(
        embedding_provider="openai",
        llm_provider="openai",
        embedding_model=None,
        llm_model=None,
        system_prompt=None,
        chunk_size=1000,
        chunk_overlap=200,
        updated_at=datetime.utcnow().isoformat()
    )


# Query Routes (Authenticated users)
@router.post("/query", response_model=QueryResponse)
async def query_agent(
    request: QueryRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Query the AI agent (standalone response)
    """
    user_id = current_user["uid"]
    conversation_id = request.conversation_id
    
    # Get agent config
    config = FirestoreService.get_agent_config()
    embedding_provider = config.get("embedding_provider", "openai") if config else "openai"
    embedding_model = config.get("embedding_model") if config else None
    llm_provider = config.get("llm_provider", "openai") if config else "openai"
    llm_model = config.get("llm_model") if config else None
    system_prompt = config.get("system_prompt") if config else None
    chunk_size = config.get("chunk_size", 1000) if config else 1000
    chunk_overlap = config.get("chunk_overlap", 200) if config else 200
    
    # Create conversation if needed
    if not conversation_id:
        conversation_id = FirestoreService.create_conversation(user_id, title=request.question[:50])
    
    # Query AI agent FIRST (before saving user message) so memory can load existing history
    # The memory will load all previous messages, then we'll add the current question
    start_time = time.time()
    try:
        logger.info(f"Querying AI agent - conversation_id: {conversation_id}, user_id: {user_id}, question: {request.question[:50]}...")
        result = await AIAgentService.query(
            question=request.question,
            conversation_id=conversation_id,
            embedding_provider=embedding_provider,
            embedding_model=embedding_model,
            llm_provider=llm_provider,
            llm_model=llm_model,
            system_prompt=system_prompt,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            user_id=user_id
        )
        logger.info(f"AI agent query completed - answer length: {len(result.get('answer', ''))}")
        
        latency_ms = (time.time() - start_time) * 1000
        
        # Save user message AFTER query (so memory loads previous messages without current question)
        FirestoreService.add_message_to_conversation(conversation_id, "user", request.question)
        
        # Save assistant message
        FirestoreService.add_message_to_conversation(conversation_id, "assistant", result["answer"])
        
        # Log AI request event for analytics
        try:
            # Calculate tokens (approximate if not provided)
            input_tokens = result.get("tokens_used", 0) // 2  # Rough estimate
            output_tokens = result.get("tokens_used", 0) - input_tokens
            
            # Calculate cost (approximate - adjust based on actual model pricing)
            # OpenAI GPT-4o-mini: $0.15/$0.60 per 1M tokens = $0.00015/$0.0006 per 1K tokens
            # Gemini 2.0 Flash: $0.3/$2.50 per 1M tokens = $0.0003/$0.0025 per 1K tokens
            cost_per_1k_input = 0.00015 if llm_provider == "openai" else 0.0003
            cost_per_1k_output = 0.0006 if llm_provider == "openai" else 0.0025
            cost_usd = (input_tokens * cost_per_1k_input / 1000) + (output_tokens * cost_per_1k_output / 1000)
            
            model_name = llm_model or (f"gpt-4o-mini" if llm_provider == "openai" else "gemini-2.0-flash-exp")
            
            FirestoreService.log_ai_event(
                event_type="ai_request",
                user_id=user_id,
                conversation_id=conversation_id,
                metadata={
                    "model": model_name,
                    "provider": llm_provider,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "total_tokens": result.get("tokens_used", 0),
                    "latency_ms": latency_ms,
                    "cost_usd": cost_usd,
                }
            )
        except Exception as e:
            logger.warning(f"Failed to log AI event: {e}")
        
        return QueryResponse(
            answer=result["answer"],
            conversation_id=conversation_id,
            tokens_used=result.get("tokens_used"),
            latency_ms=latency_ms
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error querying AI agent: {str(e)}"
        )


# Conversation Routes (Authenticated users)
@router.post("/conversations", response_model=ConversationCreateResponse)
async def create_conversation(
    request: ConversationCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new conversation
    """
    user_id = current_user["uid"]
    title = request.title or "New Conversation"
    conversation_id = FirestoreService.create_conversation(user_id, title)
    
    return ConversationCreateResponse(
        conversation_id=conversation_id,
        title=title,
        created_at=datetime.utcnow().isoformat()
    )


@router.get("/conversations", response_model=List[ConversationSummary])
async def list_conversations(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    List user's conversations
    """
    user_id = current_user["uid"]
    conversations = FirestoreService.list_conversations(user_id)
    
    return [
        ConversationSummary(
            conversation_id=conv["conversation_id"],
            title=conv["title"],
            created_at=conv["created_at"].isoformat() if isinstance(conv["created_at"], datetime) else conv["created_at"],
            updated_at=conv["updated_at"].isoformat() if isinstance(conv["updated_at"], datetime) else conv["updated_at"],
            message_count=conv["message_count"]
        )
        for conv in conversations
    ]


@router.get("/conversations/{conversation_id}", response_model=Conversation)
async def get_conversation(
    conversation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get a specific conversation
    """
    user_id = current_user["uid"]
    conv_data = FirestoreService.get_conversation(conversation_id, user_id)
    
    if not conv_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    messages = [
        Message(
            role=msg["role"],
            content=msg["content"],
            timestamp=msg["timestamp"].isoformat() if isinstance(msg.get("timestamp"), datetime) else str(msg.get("timestamp", ""))
        )
        for msg in conv_data.get("messages", [])
    ]
    
    return Conversation(
        conversation_id=conversation_id,
        user_id=user_id,
        title=conv_data.get("title", "Untitled"),
        messages=messages,
        created_at=conv_data["created_at"].isoformat() if isinstance(conv_data["created_at"], datetime) else str(conv_data["created_at"]),
        updated_at=conv_data["updated_at"].isoformat() if isinstance(conv_data["updated_at"], datetime) else str(conv_data["updated_at"]),
    )


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a conversation
    """
    user_id = current_user["uid"]
    deleted = FirestoreService.delete_conversation(conversation_id, user_id)
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    return {"message": "Conversation deleted successfully"}

