"""
Chat-related data models and Pydantic schemas.
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, validator


class MessageRole(str, Enum):
    """Message role enumeration."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class MessageStatus(str, Enum):
    """Message status enumeration."""
    SENDING = "sending"
    SENT = "sent"
    STREAMING = "streaming"
    COMPLETED = "completed"
    ERROR = "error"


class Citation(BaseModel):
    """Citation model for source references."""
    id: str = Field(..., description="Unique citation identifier")
    source_file_id: str = Field(..., description="Source file identifier")
    source_file_url: str = Field(..., description="URL to access the source file")
    source_file_name: str = Field(..., description="Name of the source file")
    content_snippet: str = Field(..., description="Relevant content snippet")
    relevance_score: Optional[float] = Field(None, description="Relevance score (0-1)")
    page_number: Optional[int] = Field(None, description="Page number in the document")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")
    
    @validator('relevance_score')
    def validate_relevance_score(cls, v):
        if v is not None and (v < 0 or v > 1):
            raise ValueError('Relevance score must be between 0 and 1')
        return v


class ChatMessage(BaseModel):
    """Chat message model."""
    id: str = Field(..., description="Unique message identifier")
    role: MessageRole = Field(..., description="Message role")
    content: str = Field(..., description="Message content")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Message timestamp")
    status: MessageStatus = Field(default=MessageStatus.SENT, description="Message status")
    citations: List[Citation] = Field(default_factory=list, description="Source citations")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ChatSession(BaseModel):
    """Chat session model."""
    id: str = Field(..., description="Unique session identifier")
    messages: List[ChatMessage] = Field(default_factory=list, description="Session messages")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Session creation time")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Last update time")
    title: Optional[str] = Field(None, description="Session title")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Session metadata")
    
    def add_message(self, message: ChatMessage) -> None:
        """Add a message to the session."""
        self.messages.append(message)
        self.updated_at = datetime.utcnow()
    
    def get_conversation_history(self, limit: Optional[int] = None) -> List[Dict[str, str]]:
        """Get conversation history formatted for LLM context."""
        messages = self.messages[-limit:] if limit else self.messages
        return [
            {
                "role": msg.role.value,
                "content": msg.content
            }
            for msg in messages
            if msg.role in [MessageRole.USER, MessageRole.ASSISTANT]
        ]
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ChatRequest(BaseModel):
    """Request model for chat endpoints."""
    message: str = Field(..., min_length=1, max_length=5000, description="User message")
    session_id: Optional[str] = Field(None, description="Session identifier")
    model: Optional[str] = Field(None, description="LLM model to use")
    provider: Optional[str] = Field(None, description="LLM provider")
    max_tokens: Optional[int] = Field(None, ge=1, le=4096, description="Maximum response tokens")
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0, description="Response temperature")
    stream: bool = Field(default=True, description="Enable streaming response")
    include_citations: bool = Field(default=True, description="Include source citations")
    
    @validator('message')
    def validate_message(cls, v):
        if not v.strip():
            raise ValueError('Message cannot be empty')
        return v.strip()


class StreamingResponse(BaseModel):
    """Model for streaming response chunks."""
    session_id: str = Field(..., description="Session identifier")
    message_id: str = Field(..., description="Message identifier")
    content_delta: str = Field(..., description="Incremental content")
    is_complete: bool = Field(default=False, description="Whether response is complete")
    citations: Optional[List[Citation]] = Field(None, description="Citations (sent on completion)")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class MessageDelta(BaseModel):
    """WebSocket message delta for streaming."""
    id: str = Field(..., description="Message identifier")
    content: str = Field(..., description="Content delta")
    is_complete: bool = Field(default=False, description="Whether message is complete")
    citations: Optional[List[Citation]] = Field(None, description="Citations if complete")
    error: Optional[str] = Field(None, description="Error message if any")
    usage: Optional[Dict[str, Any]] = Field(None, description="Token usage statistics")


class StreamingChunk(BaseModel):
    """Individual streaming chunk from LLM."""
    content: str = Field(..., description="Text content chunk")
    model: str = Field(..., description="Model used for generation")
    finish_reason: Optional[str] = Field(None, description="Reason for completion (stop, error, etc.)")
    usage: Optional[Dict[str, Any]] = Field(None, description="Token usage statistics")
