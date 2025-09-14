"""
WebSocket session management for handling multiple concurrent connections.
"""

import json
import logging
from datetime import datetime
from typing import Dict, Set, Optional
from fastapi import WebSocket, WebSocketDisconnect

from app.models import ChatSession, WebSocketMessage, WebSocketMessageType

logger = logging.getLogger(__name__)


class SessionManager:
    """Manages WebSocket sessions and connections."""
    
    def __init__(self):
        # Active WebSocket connections: session_id -> set of websockets
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Session data: session_id -> ChatSession
        self.sessions: Dict[str, ChatSession] = {}
        # WebSocket to session mapping: websocket -> session_id
        self.websocket_sessions: Dict[WebSocket, str] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str) -> None:
        """Accept a new WebSocket connection."""
        await websocket.accept()
        
        # Add connection to active connections
        if session_id not in self.active_connections:
            self.active_connections[session_id] = set()
        
        self.active_connections[session_id].add(websocket)
        self.websocket_sessions[websocket] = session_id
        
        # Create session if it doesn't exist
        if session_id not in self.sessions:
            self.sessions[session_id] = ChatSession(
                id=session_id,
                created_at=datetime.utcnow()
            )
        
        logger.info(f"WebSocket connected for session {session_id}")
        
        # Send session start event
        await self.send_to_session(
            session_id,
            WebSocketMessage(
                type=WebSocketMessageType.SESSION_START,
                data={"session_id": session_id, "timestamp": datetime.utcnow().isoformat()},
                session_id=session_id
            )
        )
    
    def disconnect(self, websocket: WebSocket) -> Optional[str]:
        """Handle WebSocket disconnection."""
        session_id = self.websocket_sessions.get(websocket)
        
        if session_id:
            # Remove from active connections
            if session_id in self.active_connections:
                self.active_connections[session_id].discard(websocket)
                
                # Remove session if no more connections
                if not self.active_connections[session_id]:
                    del self.active_connections[session_id]
            
            # Remove websocket mapping
            del self.websocket_sessions[websocket]
            
            logger.info(f"WebSocket disconnected for session {session_id}")
            
            return session_id
        
        return None
    
    async def send_to_websocket(self, websocket: WebSocket, message: WebSocketMessage) -> None:
        """Send message to a specific WebSocket."""
        try:
            await websocket.send_text(message.json())
        except Exception as e:
            logger.error(f"Failed to send message to WebSocket: {e}")
            # Remove the failed connection
            self.disconnect(websocket)
    
    async def send_to_session(self, session_id: str, message: WebSocketMessage) -> None:
        """Send message to all WebSockets in a session."""
        if session_id in self.active_connections:
            # Create a copy of the set to avoid modification during iteration
            connections = self.active_connections[session_id].copy()
            
            for websocket in connections:
                await self.send_to_websocket(websocket, message)
    
    async def broadcast(self, message: WebSocketMessage, exclude_session: Optional[str] = None) -> None:
        """Broadcast message to all active sessions."""
        for session_id in self.active_connections:
            if exclude_session and session_id == exclude_session:
                continue
            await self.send_to_session(session_id, message)
    
    def get_session(self, session_id: str) -> Optional[ChatSession]:
        """Get session data."""
        return self.sessions.get(session_id)
    
    def update_session(self, session: ChatSession) -> None:
        """Update session data."""
        session.updated_at = datetime.utcnow()
        self.sessions[session.id] = session
    
    def delete_session(self, session_id: str) -> bool:
        """Delete a session and disconnect all WebSockets."""
        if session_id in self.sessions:
            # Disconnect all WebSockets for this session
            if session_id in self.active_connections:
                connections = self.active_connections[session_id].copy()
                for websocket in connections:
                    try:
                        # Send session end event before disconnecting
                        session_end_msg = WebSocketMessage(
                            type=WebSocketMessageType.SESSION_END,
                            data={
                                "session_id": session_id,
                                "message_count": len(self.sessions[session_id].messages),
                                "timestamp": datetime.utcnow().isoformat()
                            },
                            session_id=session_id
                        )
                        # Note: We can't await here, so we'll send synchronously
                        websocket.send_text(session_end_msg.json())
                        websocket.close()
                    except Exception as e:
                        logger.error(f"Error closing WebSocket for session {session_id}: {e}")
                
                del self.active_connections[session_id]
            
            # Remove session data
            del self.sessions[session_id]
            logger.info(f"Session {session_id} deleted")
            return True
        
        return False
    
    def get_session_stats(self) -> Dict[str, int]:
        """Get session statistics."""
        active_sessions = len(self.active_connections)
        total_connections = sum(len(connections) for connections in self.active_connections.values())
        total_sessions = len(self.sessions)
        
        return {
            "active_sessions": active_sessions,
            "total_connections": total_connections,
            "total_sessions": total_sessions
        }
    
    def cleanup_inactive_sessions(self, max_age_hours: int = 24) -> int:
        """Clean up inactive sessions older than max_age_hours."""
        current_time = datetime.utcnow()
        sessions_to_remove = []
        
        for session_id, session in self.sessions.items():
            # Skip active sessions
            if session_id in self.active_connections:
                continue
            
            # Check if session is too old
            age_hours = (current_time - session.updated_at).total_seconds() / 3600
            if age_hours > max_age_hours:
                sessions_to_remove.append(session_id)
        
        # Remove old sessions
        for session_id in sessions_to_remove:
            del self.sessions[session_id]
        
        logger.info(f"Cleaned up {len(sessions_to_remove)} inactive sessions")
        return len(sessions_to_remove)


# Global session manager instance
session_manager = SessionManager()