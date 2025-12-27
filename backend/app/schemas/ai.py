from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime


# File Management Schemas
class FileUploadResponse(BaseModel):
    filename: str
    path: str
    size: int
    content_type: str
    created_at: str
    url: Optional[str] = None


class FileInfo(BaseModel):
    filename: str
    path: str
    size: int
    content_type: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class FileContent(BaseModel):
    filename: str
    path: str
    content: str
    size: int
    content_type: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# AI Agent Configuration Schemas
class AgentConfig(BaseModel):
    embedding_provider: Literal["openai", "gemini"] = Field(..., description="Embedding provider")
    llm_provider: Literal["openai", "gemini"] = Field(..., description="LLM provider")
    embedding_model: Optional[str] = Field(None, description="Specific embedding model")
    llm_model: Optional[str] = Field(None, description="Specific LLM model")


class AgentConfigResponse(BaseModel):
    embedding_provider: str
    llm_provider: str
    embedding_model: Optional[str] = None
    llm_model: Optional[str] = None
    updated_at: str


# Query Schemas
class QueryRequest(BaseModel):
    question: str = Field(..., description="User question")
    conversation_id: Optional[str] = Field(None, description="Conversation ID for memory")


class QueryResponse(BaseModel):
    answer: str
    conversation_id: str
    tokens_used: Optional[int] = None
    latency_ms: Optional[float] = None


class StreamChunk(BaseModel):
    chunk: str
    conversation_id: str
    done: bool = False


# Conversation Schemas
class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    timestamp: str


class Conversation(BaseModel):
    conversation_id: str
    user_id: str
    title: Optional[str] = None
    messages: List[Message]
    created_at: str
    updated_at: str


class ConversationSummary(BaseModel):
    conversation_id: str
    title: Optional[str] = None
    created_at: str
    updated_at: str
    message_count: int

