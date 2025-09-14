"""
FastAPI main application with WebSocket support for RAG Chat.
"""

import logging
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.models import HealthResponse, ErrorResponse
from app.websockets.chat_handler import router as websocket_router

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("Starting RAG Chat API server...")
    
    # Initialize services
    try:
        # Initialize services
        from app.services.vector_service import vector_service
        from app.services.llm_service import llm_service
        
        await vector_service.initialize()
        await llm_service.initialize()
        
        logger.info("Services initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        raise
    
    yield
    
    logger.info("Shutting down RAG Chat API server...")
    
    # Cleanup services
    try:
        from app.services.vector_service import vector_service
        from app.services.llm_service import llm_service
        
        await vector_service.cleanup()
        await llm_service.cleanup()
        
        logger.info("Services cleaned up successfully")
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")


# Create FastAPI application
app = FastAPI(
    title="RAG Chat API",
    description="WebSocket-based RAG Chat API with LlamaIndex and Weaviate",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    """Handle HTTP exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=exc.detail,
            code=f"HTTP_{exc.status_code}"
        ).dict()
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc: Exception):
    """Handle general exceptions."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error="Internal server error",
            code="INTERNAL_ERROR",
            details={"message": str(exc)} if settings.debug else None
        ).dict()
    )


# Health check endpoint
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    try:
        from app.services.vector_service import vector_service
        from app.services.llm_service import llm_service
        
        # Check service health
        vector_health = await vector_service.health_check()
        llm_health = await llm_service.health_check()
        
        overall_status = "healthy"
        if vector_health.get("status") != "healthy" or llm_health.get("status") != "healthy":
            overall_status = "degraded"
        
        return HealthResponse(
            status=overall_status,
            version="1.0.0",
            services={
                "weaviate": vector_health.get("status", "unknown"),
                "llm_service": llm_health.get("status", "unknown"),
                "document_count": str(vector_health.get("document_count", 0))
            }
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return HealthResponse(
            status="error",
            version="1.0.0",
            services={
                "weaviate": "error",
                "llm_service": "error",
                "error": str(e)
            }
        )


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": "RAG Chat API",
        "version": "1.0.0",
        "description": "WebSocket-based RAG Chat API",
        "endpoints": {
            "health": "/health",
            "websocket": "/ws/{session_id}",
            "docs": "/docs" if settings.debug else "disabled"
        }
    }


# Include WebSocket router
app.include_router(websocket_router, prefix="/ws")


# Additional REST endpoints for session management
@app.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get session information."""
    # TODO: Implement session retrieval
    return {"session_id": session_id, "status": "not_implemented"}


@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session."""
    # TODO: Implement session deletion
    return {"session_id": session_id, "deleted": True}


@app.get("/sessions")
async def list_sessions():
    """List all sessions."""
    # TODO: Implement session listing
    return {"sessions": [], "total": 0}


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )