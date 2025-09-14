"""
WebSocket chat handler for real-time RAG chat functionality.
"""

import json
import logging
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from uuid import uuid4

from app.config import settings
from app.models import (
    ChatMessage, MessageRole, MessageStatus, WebSocketMessage, 
    WebSocketMessageType, MessageDelta, ChatRequest
)
from app.websockets.session_manager import session_manager

logger = logging.getLogger(__name__)

router = APIRouter()


class ChatWebSocketHandler:
    """Handles WebSocket chat interactions."""
    
    def __init__(self, websocket: WebSocket, session_id: str):
        self.websocket = websocket
        self.session_id = session_id
        self.is_processing = False
    
    async def handle_message(self, data: Dict[str, Any]) -> None:
        """Handle incoming WebSocket message."""
        try:
            message_type = data.get("type", "chat_message")
            
            if message_type == "chat_message":
                await self.handle_chat_message(data)
            elif message_type == "ping":
                await self.handle_ping()
            else:
                await self.send_error(f"Unknown message type: {message_type}")
                
        except Exception as e:
            logger.error(f"Error handling message: {e}", exc_info=True)
            await self.send_error(f"Failed to process message: {str(e)}")
    
    async def handle_chat_message(self, data: Dict[str, Any]) -> None:
        """Handle chat message from user."""
        if self.is_processing:
            await self.send_error("Please wait for the current response to complete")
            return
        
        try:
            # Extract message content
            message_content = data.get("message", "").strip()
            if not message_content:
                await self.send_error("Message content cannot be empty")
                return
            
            # Create chat request
            chat_request = ChatRequest(
                message=message_content,
                session_id=self.session_id,
                model=data.get("model"),
                provider=data.get("provider"),
                max_tokens=data.get("max_tokens"),
                temperature=data.get("temperature"),
                stream=data.get("stream", True),
                include_citations=data.get("include_citations", True)
            )
            
            # Process the chat request
            await self.process_chat_request(chat_request)
            
        except Exception as e:
            logger.error(f"Error in chat message handling: {e}", exc_info=True)
            await self.send_error(f"Failed to process chat message: {str(e)}")
    
    async def process_chat_request(self, request: ChatRequest) -> None:
        """Process chat request with RAG and LLM."""
        self.is_processing = True
        
        try:
            # Get or create session
            session = session_manager.get_session(self.session_id)
            if not session:
                await self.send_error("Session not found")
                return
            
            # Create user message
            user_message = ChatMessage(
                id=str(uuid4()),
                role=MessageRole.USER,
                content=request.message,
                status=MessageStatus.SENT
            )
            
            # Add user message to session
            session.add_message(user_message)
            session_manager.update_session(session)
            
            # Send typing indicator
            await self.send_typing_start()
            
            # Create assistant message placeholder
            assistant_message_id = str(uuid4())
            assistant_message = ChatMessage(
                id=assistant_message_id,
                role=MessageRole.ASSISTANT,
                content="",
                status=MessageStatus.STREAMING
            )
            
            # Phase 3 - RAG functionality with LlamaIndex and Weaviate
            await self.process_rag_response(assistant_message_id, request)
            
            # Update assistant message status
            assistant_message.status = MessageStatus.COMPLETED
            session.add_message(assistant_message)
            session_manager.update_session(session)
            
        except Exception as e:
            logger.error(f"Error processing chat request: {e}", exc_info=True)
            await self.send_error(f"Failed to generate response: {str(e)}")
        finally:
            self.is_processing = False
            await self.send_typing_stop()
    
    async def process_rag_response(self, message_id: str, request: ChatRequest) -> None:
        """Process RAG response with vector search and LLM streaming."""
        try:
            # Import services
            from app.services.vector_service import get_vector_service
            from app.services.llm_service import get_llm_service
            from app.services.citation_service import citation_service
            
            # Get conversation history
            session = session_manager.get_session(self.session_id)
            messages = session.get_messages() if session else []
            
            # Convert session messages to chat messages for LLM
            chat_messages = [
                ChatMessage(
                    id=msg.id,
                    role=msg.role,
                    content=msg.content,
                    status=msg.status
                )
                for msg in messages[-10:]  # Last 10 messages for context
            ]
            
            # Add current user message
            user_message = ChatMessage(
                id=str(uuid4()),
                role=MessageRole.USER,
                content=request.message,
                status=MessageStatus.SENT
            )
            chat_messages.append(user_message)
            
            # Vector search for relevant documents
            async with get_vector_service() as vector_service:
                documents, scores = await vector_service.similarity_search(
                    query=request.message,
                    limit=5,
                    score_threshold=0.6
                )
            
            # Process citations
            citations = citation_service.process_retrieved_documents(
                documents, request.message
            )
            
            # Send citations to client immediately
            if citations:
                citations_message = WebSocketMessage(
                    type=WebSocketMessageType.CITATIONS,
                    data={"citations": [citation for citation in citations]},
                    session_id=self.session_id,
                    message_id=message_id
                )
                await session_manager.send_to_websocket(self.websocket, citations_message)
            
            # Prepare context for LLM
            context = "\n\n".join([
                f"Source: {doc.get('source_file_name', 'Unknown')}\n{doc.get('content', '')}"
                for doc in documents
            ])
            
            # Stream LLM response
            async with get_llm_service() as llm_service:
                full_content = ""
                
                async for chunk in llm_service.stream_completion(
                    messages=chat_messages,
                    model_name=request.model,
                    context=context,
                    citations=[citation for citation in citations]
                ):
                    if chunk.content:
                        full_content += chunk.content
                        
                        # Send streaming chunk
                        delta = MessageDelta(
                            id=message_id,
                            content=chunk.content,
                            is_complete=False
                        )
                        await self.send_message_delta(delta)
                    
                    # Check if streaming is complete
                    if chunk.finish_reason == "stop":
                        # Send final completion message
                        completion_delta = MessageDelta(
                            id=message_id,
                            content="",
                            is_complete=True,
                            citations=citations if citations else None,
                            usage=chunk.usage
                        )
                        await self.send_message_complete(completion_delta)
                        break
                    elif chunk.finish_reason == "error":
                        await self.send_error(f"LLM Error: {chunk.content}")
                        break
        
        except Exception as e:
            logger.error(f"Error in RAG processing: {e}", exc_info=True)
            await self.send_error(f"RAG processing failed: {str(e)}")
    
    async def simulate_response(self, message_id: str, user_message: str) -> None:
        """Fallback simulation if RAG fails."""
        # Simulate response text
        response_text = f"This is a simulated response to: '{user_message}'. RAG functionality encountered an error, falling back to simulation."
        
        # Simulate streaming by sending chunks
        words = response_text.split()
        
        for i, word in enumerate(words):
            # Send delta
            delta = MessageDelta(
                id=message_id,
                content=word + " ",
                is_complete=False
            )
            
            await self.send_message_delta(delta)
            await asyncio.sleep(0.05)
        
        # Send completion
        completion_delta = MessageDelta(
            id=message_id,
            content="",
            is_complete=True
        )
        
        await self.send_message_complete(completion_delta)
    
    async def send_message_delta(self, delta: MessageDelta) -> None:
        """Send message delta to client."""
        message = WebSocketMessage(
            type=WebSocketMessageType.MESSAGE_DELTA,
            data=delta.dict(),
            session_id=self.session_id,
            message_id=delta.id
        )
        
        await session_manager.send_to_websocket(self.websocket, message)
    
    async def send_message_complete(self, delta: MessageDelta) -> None:
        """Send message completion to client."""
        message = WebSocketMessage(
            type=WebSocketMessageType.MESSAGE_COMPLETE,
            data=delta.dict(),
            session_id=self.session_id,
            message_id=delta.id
        )
        
        await session_manager.send_to_websocket(self.websocket, message)
    
    async def send_typing_start(self) -> None:
        """Send typing start indicator."""
        message = WebSocketMessage(
            type=WebSocketMessageType.TYPING_START,
            data={"is_typing": True},
            session_id=self.session_id
        )
        
        await session_manager.send_to_websocket(self.websocket, message)
    
    async def send_typing_stop(self) -> None:
        """Send typing stop indicator."""
        message = WebSocketMessage(
            type=WebSocketMessageType.TYPING_STOP,
            data={"is_typing": False},
            session_id=self.session_id
        )
        
        await session_manager.send_to_websocket(self.websocket, message)
    
    async def send_error(self, error_message: str, code: str = "WEBSOCKET_ERROR") -> None:
        """Send error message to client."""
        message = WebSocketMessage(
            type=WebSocketMessageType.ERROR,
            data={
                "error": error_message,
                "code": code
            },
            session_id=self.session_id
        )
        
        await session_manager.send_to_websocket(self.websocket, message)
    
    async def handle_ping(self) -> None:
        """Handle ping message (keepalive)."""
        message = WebSocketMessage(
            type=WebSocketMessageType.CONNECTION_STATUS,
            data={"status": "pong"},
            session_id=self.session_id
        )
        
        await session_manager.send_to_websocket(self.websocket, message)


@router.websocket("/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """Main WebSocket endpoint for chat functionality."""
    # Connect to session manager
    await session_manager.connect(websocket, session_id)
    
    # Create chat handler
    handler = ChatWebSocketHandler(websocket, session_id)
    
    try:
        while True:
            # Receive message from client
            try:
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                # Handle the message
                await handler.handle_message(message_data)
                
            except json.JSONDecodeError:
                await handler.send_error("Invalid JSON format")
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"WebSocket error: {e}", exc_info=True)
                await handler.send_error(f"WebSocket error: {str(e)}")
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
    finally:
        # Clean up
        session_manager.disconnect(websocket)