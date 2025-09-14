"""
API response models and WebSocket message schemas.
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field

from .chat_models import Citation, ChatMessage
from pydantic import validator


class WebSocketMessageType(str, Enum):
    """WebSocket message types."""
    MESSAGE_DELTA = "message_delta"
    MESSAGE_COMPLETE = "message_complete"
    CITATIONS = "citations"
    ERROR = "error"
    SESSION_START = "session_start"
    SESSION_END = "session_end"
    CONNECTION_STATUS = "connection_status"
    TYPING_START = "typing_start"
    TYPING_STOP = "typing_stop"


class WebSocketMessage(BaseModel):
    """WebSocket message wrapper."""
    type: WebSocketMessageType = Field(..., description="Message type")
    data: Dict[str, Any] = Field(..., description="Message payload")
    session_id: Optional[str] = Field(None, description="Session identifier")
    message_id: Optional[str] = Field(None, description="Message identifier")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Message timestamp")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ChatResponse(BaseModel):
    """Response model for chat completion."""
    message_id: str = Field(..., description="Generated message identifier")
    session_id: str = Field(..., description="Session identifier")
    content: str = Field(..., description="Response content")
    citations: List[Citation] = Field(default_factory=list, description="Source citations")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Response metadata")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ErrorResponse(BaseModel):
    """Error response model."""
    error: str = Field(..., description="Error message")
    code: str = Field(..., description="Error code")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class SessionInfo(BaseModel):
    """Session information response."""
    session_id: str = Field(..., description="Session identifier")
    created_at: datetime = Field(..., description="Session creation time")
    updated_at: datetime = Field(..., description="Last update time")
    message_count: int = Field(..., description="Number of messages in session")
    title: Optional[str] = Field(None, description="Session title")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = Field(..., description="Health status")
    version: str = Field(..., description="API version")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Health check timestamp")
    services: Dict[str, str] = Field(default_factory=dict, description="Service statuses")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class MessageDelta(BaseModel):
    """Message delta for streaming responses."""
    id: str = Field(..., description="Message identifier")
    content: str = Field(..., description="Content delta")
    is_complete: bool = Field(default=False, description="Whether message is complete")
    citations: Optional[List[Citation]] = Field(None, description="Citations (sent when complete)")
    usage: Optional[Dict[str, Any]] = Field(None, description="Token usage statistics")


class VectorSearchResult(BaseModel):
    """Vector search result from Weaviate."""
    id: str = Field(..., description="Document chunk ID")
    content: str = Field(..., description="Chunk content")
    distance: float = Field(..., description="Vector distance")
    certainty: float = Field(..., description="Certainty score")
    source_file_id: str = Field(..., description="Source file ID")
    source_file_url: str = Field(..., description="Source file URL")
    source_file_name: str = Field(..., description="Source file name")
    page_number: Optional[int] = Field(None, description="Page number")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    
    def to_citation(self) -> Citation:
        """Convert to Citation model."""
        return Citation(
            id=self.id,
            source_file_id=self.source_file_id,
            source_file_url=self.source_file_url,
            source_file_name=self.source_file_name,
            content_snippet=self.content[:500] + "..." if len(self.content) > 500 else self.content,
            relevance_score=self.certainty,
            page_number=self.page_number,
            metadata=self.metadata
        )


class SearchRequest(BaseModel):
    """Vector search request."""
    query: str = Field(..., min_length=1, description="Search query")
    limit: int = Field(default=5, ge=1, le=20, description="Number of results")
    min_certainty: float = Field(default=0.7, ge=0.0, le=1.0, description="Minimum certainty threshold")
    
    @validator('query')
    def validate_query(cls, v):
        if not v.strip():
            raise ValueError('Query cannot be empty')
        return v.strip()


class SearchResponse(BaseModel):
    """Vector search response."""
    query: str = Field(..., description="Original search query")
    results: List[VectorSearchResult] = Field(..., description="Search results")
    total_results: int = Field(..., description="Total number of results")
    processing_time_ms: float = Field(..., description="Processing time in milliseconds")


# WebSocket event models
class ConnectionStatusEvent(BaseModel):
    """Connection status change event."""
    status: str = Field(..., description="Connection status")
    session_id: Optional[str] = Field(None, description="Session ID")


class TypingEvent(BaseModel):
    """Typing indicator event."""
    is_typing: bool = Field(..., description="Whether assistant is typing")
    session_id: str = Field(..., description="Session ID")


class SessionStartEvent(BaseModel):
    """Session start event."""
    session_id: str = Field(..., description="New session ID")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class SessionEndEvent(BaseModel):
    """Session end event."""
    session_id: str = Field(..., description="Ended session ID")
    message_count: int = Field(..., description="Total messages in session")
    duration_seconds: float = Field(..., description="Session duration")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }