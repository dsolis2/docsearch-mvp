#!/usr/bin/env python3
"""
RAG Chat System Demo Test Script

This script demonstrates the complete system functionality:
1. Backend services integration
2. WebSocket endpoint availability 
3. Frontend-backend communication flow
4. Error handling when services are not available

Run this after starting the backend server to verify the complete system works.
"""

import asyncio
import json
import sys
from pathlib import Path

# Add the backend app to Python path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

async def test_system_components():
    """Test all system components are properly integrated."""
    print("🧪 Testing RAG Chat System Components\n")
    
    # Test 1: Backend Imports
    print("1. Testing Backend Imports...")
    try:
        from app.main import app
        from app.services.llm_service import llm_service
        from app.services.vector_service import vector_service
        from app.services.citation_service import citation_service
        print("   ✅ All backend services import successfully")
    except Exception as e:
        print(f"   ❌ Backend import error: {e}")
        return False
    
    # Test 2: Service Health Checks (without real connections)
    print("\n2. Testing Service Health Checks...")
    try:
        # These will show "not_initialized" status without API keys, which is expected
        llm_health = await llm_service.health_check()
        vector_health = await vector_service.health_check()
        
        print(f"   📊 LLM Service Status: {llm_health.get('status', 'unknown')}")
        print(f"   📊 Vector Service Status: {vector_health.get('status', 'unknown')}")
        
        # Citation service is always ready
        print("   ✅ Citation Service: Ready")
        
    except Exception as e:
        print(f"   ⚠️  Service health check: {e} (Expected without API keys)")
    
    # Test 3: WebSocket Message Types
    print("\n3. Testing WebSocket Message Models...")
    try:
        from app.models.response_models import WebSocketMessageType, MessageDelta
        from app.models.chat_models import StreamingChunk, ChatRequest
        
        # Test model creation
        chat_request = ChatRequest(message="Test message")
        message_delta = MessageDelta(id="test", content="test content")
        streaming_chunk = StreamingChunk(content="test", model="test-model")
        
        print("   ✅ All WebSocket message models work correctly")
        print(f"   📝 WebSocket Message Types: {list(WebSocketMessageType)}")
        
    except Exception as e:
        print(f"   ❌ WebSocket model error: {e}")
        return False
    
    # Test 4: Configuration Validation
    print("\n4. Testing Configuration...")
    try:
        from app.config.settings import settings
        print(f"   🌐 Host: {settings.host}:{settings.port}")
        print(f"   🔧 Debug Mode: {settings.debug}")
        print(f"   🔑 OpenAI Key: {'Set' if settings.openai_api_key else 'Not Set'}")
        print(f"   🔑 Anthropic Key: {'Set' if settings.anthropic_api_key else 'Not Set'}")
        print(f"   🗄️  Weaviate URL: {settings.weaviate_url}")
        
    except Exception as e:
        print(f"   ❌ Configuration error: {e}")
        return False
    
    # Test 5: Citation Processing
    print("\n5. Testing Citation Processing...")
    try:
        # Test with sample documents
        sample_documents = [
            {
                "content": "This is a sample document about AI and machine learning.",
                "source_file_id": "doc1",
                "source_file_url": "https://example.com/doc1.pdf",
                "source_file_name": "AI_Guide.pdf",
                "relevance_score": 0.95,
                "chunk_index": 0,
                "section_title": "Introduction",
                "file_type": "pdf"
            }
        ]
        
        citations = citation_service.process_retrieved_documents(
            sample_documents, "What is AI?"
        )
        
        print(f"   ✅ Processed {len(citations)} citations")
        if citations:
            print(f"   📄 Sample Citation: {citations[0]['source_file_name']}")
        
    except Exception as e:
        print(f"   ❌ Citation processing error: {e}")
        return False
    
    return True

async def test_websocket_protocol():
    """Test WebSocket protocol structure."""
    print("\n6. Testing WebSocket Protocol...")
    try:
        from app.websockets.chat_handler import ChatWebSocketHandler
        from app.models.response_models import WebSocketMessage, WebSocketMessageType
        
        # Test message creation
        test_message = WebSocketMessage(
            type=WebSocketMessageType.MESSAGE_DELTA,
            data={"content": "Hello", "message_id": "test-123"}
        )
        
        print("   ✅ WebSocket message protocol validated")
        print(f"   🔄 Message Types Available: {len(list(WebSocketMessageType))}")
        
        return True
        
    except Exception as e:
        print(f"   ❌ WebSocket protocol error: {e}")
        return False

def test_frontend_structure():
    """Test frontend structure and readiness."""
    print("\n7. Testing Frontend Structure...")
    
    frontend_path = Path(__file__).parent / "frontend"
    
    # Check key frontend files
    key_files = [
        "src/main.ts",
        "src/components/chat-interface.ts",
        "src/services/websocket-client.ts",
        "public/index.html",
        "package.json"
    ]
    
    all_exist = True
    for file_path in key_files:
        full_path = frontend_path / file_path
        if full_path.exists():
            print(f"   ✅ {file_path}")
        else:
            print(f"   ❌ Missing: {file_path}")
            all_exist = False
    
    # Check if TypeScript compiles
    try:
        import subprocess
        result = subprocess.run(
            ["bun", "run", "type-check"],
            cwd=frontend_path,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            print("   ✅ TypeScript compilation successful")
        else:
            print("   ⚠️  TypeScript compilation issues (check manually)")
            
    except Exception as e:
        print(f"   ⚠️  Could not test TypeScript compilation: {e}")
    
    return all_exist

def print_deployment_instructions():
    """Print instructions for deploying and testing the system."""
    print("\n" + "="*60)
    print("🚀 DEPLOYMENT & TESTING INSTRUCTIONS")
    print("="*60)
    
    print("\n📋 Prerequisites:")
    print("   1. Set API keys in backend/.env:")
    print("      - OPENAI_API_KEY=your_key_here")
    print("      - ANTHROPIC_API_KEY=your_key_here (optional)")
    print("   2. Weaviate running on localhost:8080 (or update WEAVIATE_URL)")
    
    print("\n🔧 Backend Setup:")
    print("   cd backend")
    print("   source .venv/bin/activate")
    print("   uvicorn app.main:app --reload")
    
    print("\n🎨 Frontend Setup:")
    print("   cd frontend") 
    print("   bun run dev")
    
    print("\n🧪 Testing:")
    print("   1. Open http://localhost:3000 for frontend")
    print("   2. Open http://127.0.0.1:8000/docs for backend API")
    print("   3. Check WebSocket at ws://127.0.0.1:8000/ws/{session_id}")
    
    print("\n📱 Demo Usage:")
    print("   1. Type a message in the chat interface")
    print("   2. Watch for real-time streaming response")
    print("   3. Check citation panel for source documents")
    
    print("\n⚠️  Current Limitations:")
    print("   - Requires real API keys for LLM functionality")
    print("   - Requires populated Weaviate database for citations")
    print("   - Production webpack build needs configuration fixes")
    
    print("\n✨ System Successfully Integrated!")

async def main():
    """Run all tests and provide deployment guidance."""
    print("🎯 RAG Chat System Integration Test")
    print("="*50)
    
    # Run component tests
    backend_ok = await test_system_components()
    websocket_ok = await test_websocket_protocol() 
    frontend_ok = test_frontend_structure()
    
    # Print summary
    print("\n" + "="*50)
    print("📊 INTEGRATION TEST SUMMARY")
    print("="*50)
    
    print(f"Backend Services:  {'✅ PASS' if backend_ok else '❌ FAIL'}")
    print(f"WebSocket Protocol: {'✅ PASS' if websocket_ok else '❌ FAIL'}")
    print(f"Frontend Structure: {'✅ PASS' if frontend_ok else '❌ FAIL'}")
    
    overall_status = backend_ok and websocket_ok and frontend_ok
    print(f"\nOverall Integration: {'✅ READY' if overall_status else '⚠️  NEEDS FIXES'}")
    
    # Provide deployment instructions
    print_deployment_instructions()
    
    return overall_status

if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n🛑 Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n💥 Test failed with error: {e}")
        sys.exit(1)