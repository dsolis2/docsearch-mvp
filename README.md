# RAG Chat System MVP

A Retrieval-Augmented Generation (RAG) chat system built with vanilla TypeScript frontend and FastAPI backend, designed for WordPress plugin compatibility.

## 🏗️ Architecture Overview

- **Frontend**: Vanilla TypeScript + Web Components (NO frameworks)
- **Backend**: FastAPI + WebSocket streaming + LlamaIndex
- **Database**: Weaviate vector database (pre-populated by coworker)
- **Output**: Single JS bundle for WordPress integration

## 📁 Project Structure

```
docsearch-mvp/
├── frontend/                  # TypeScript frontend
│   ├── src/                  
│   │   ├── components/       # Web Components
│   │   ├── services/         # WebSocket & API clients
│   │   ├── types/           # TypeScript interfaces
│   │   └── utils/           # Helper functions
│   ├── public/              # Demo HTML page
│   └── webpack.config.js    # Build configuration
├── backend/                  # FastAPI backend
│   ├── app/
│   │   ├── services/        # LLM, Vector, Citation services
│   │   ├── websockets/      # WebSocket handlers
│   │   ├── models/          # Pydantic models
│   │   └── config/          # Settings
│   └── requirements.txt     # Python dependencies
└── wordpress-plugin/         # WordPress integration (TBD)
```

## 🚀 Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+ (if using npm) OR Bun (recommended)
- Local Weaviate instance OR Weaviate Cloud Services
- OpenAI API key (required)
- Anthropic API key (optional)

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   uv venv  # or python -m venv .venv
   source .venv/bin/activate  # or .venv\Scripts\activate on Windows
   ```

3. **Install dependencies**
   ```bash
   uv pip install -r requirements.txt  # or pip install -r requirements.txt
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

5. **Required Environment Variables**
   ```env
   # API Keys (Required)
   OPENAI_API_KEY=your_openai_api_key_here
   ANTHROPIC_API_KEY=your_anthropic_api_key_here  # Optional
   
   # Weaviate Configuration
   WEAVIATE_URL=http://localhost:8080
   WEAVIATE_API_KEY=  # Leave empty for local instance
   
   # Server Configuration
   HOST=127.0.0.1
   PORT=8000
   DEBUG=true
   CORS_ORIGINS=["http://localhost:3000", "http://localhost:8080", "http://127.0.0.1:5500"]
   ```

6. **Start the backend server**
   ```bash
   uvicorn app.main:app --reload
   ```

   The API will be available at `http://127.0.0.1:8000`
   - Health check: `http://127.0.0.1:8000/health`
   - API docs: `http://127.0.0.1:8000/docs`
   - WebSocket: `ws://127.0.0.1:8000/ws/{session_id}`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   bun install  # or npm install
   ```

3. **Build the frontend**
   ```bash
   bun run build  # or npm run build
   ```
   
   **Note**: Currently has TypeScript compilation errors that need fixing.

4. **Development server**
   ```bash
   bun run dev  # or npm run dev
   ```

5. **View demo page**
   Open `public/index.html` in your browser or serve it with a local server:
   ```bash
   # Using Python
   cd public && python -m http.server 5500
   
   # Using Node
   npx http-server public -p 5500
   ```

## 🔧 Current Status & Next Steps

### ✅ Completed
- [x] Project structure and build configuration
- [x] FastAPI backend with WebSocket support
- [x] LlamaIndex + Weaviate integration
- [x] Citation processing service
- [x] Web Components architecture
- [x] Demo HTML page
- [x] Backend service initialization

### 🔄 In Progress
- [ ] TypeScript compilation fixes needed
- [ ] Frontend-backend WebSocket integration

### 📋 Pending
- [ ] WordPress plugin development
- [ ] End-to-end testing with real data
- [ ] Production deployment configuration

## 🎯 Key Features

### Backend Features
- **Multi-LLM Support**: OpenAI (GPT-3.5, GPT-4) and Anthropic (Claude 3)
- **Vector Search**: Weaviate integration with semantic search
- **WebSocket Streaming**: Real-time response streaming
- **Citation Management**: Automatic source citation extraction
- **Health Monitoring**: Service status endpoints
- **Error Handling**: Comprehensive error management

### Frontend Features
- **Web Components**: Framework-agnostic custom elements
- **Shadow DOM**: Isolated styling and behavior
- **Real-time Chat**: WebSocket-based streaming
- **Citation Display**: Interactive source references
- **WordPress Ready**: Single bundle output for easy integration

## 🛠️ Development Workflow

### Backend Development
```bash
cd backend
source .venv/bin/activate

# Run with auto-reload
uvicorn app.main:app --reload

# Run tests
pytest

# Code formatting
black app/
isort app/
```

### Frontend Development
```bash
cd frontend

# Development mode with watch
bun run dev

# Type checking
bun run type-check

# Build for production
bun run build
```

## 📡 API Endpoints

### REST Endpoints
- `GET /health` - Health check and service status
- `GET /sessions/{session_id}` - Get session information
- `DELETE /sessions/{session_id}` - Delete session
- `GET /sessions` - List all sessions

### WebSocket Endpoint
- `WS /ws/{session_id}` - Real-time chat communication

### WebSocket Message Types
- `message_delta` - Streaming response chunks
- `message_complete` - Response completion
- `citations` - Source citations
- `error` - Error messages
- `typing_start/stop` - Typing indicators

## 🔍 Troubleshooting

### Common Issues

1. **Backend won't start**
   - Check API keys in `.env`
   - Ensure virtual environment is activated
   - Verify Weaviate is running (if using local instance)

2. **Frontend compilation errors**
   - TypeScript issues need to be resolved
   - Check that all dependencies are installed
   - Verify webpack configuration

3. **WebSocket connection fails**
   - Check CORS configuration
   - Ensure backend server is running
   - Verify WebSocket URL in frontend

### Service Health Checks
```bash
# Check backend health
curl http://127.0.0.1:8000/health

# Check if Weaviate is running
curl http://localhost:8080/v1/meta

# Test WebSocket connection
wscat -c ws://127.0.0.1:8000/ws/test-session
```

## 📝 Configuration Reference

### Backend Configuration (`.env`)
```env
# Server
HOST=127.0.0.1
PORT=8000
DEBUG=true
LOG_LEVEL=INFO

# CORS (JSON array format)
CORS_ORIGINS=["http://localhost:3000"]

# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Weaviate
WEAVIATE_URL=http://localhost:8080
WEAVIATE_API_KEY=

# LLM Defaults
DEFAULT_MODEL=gpt-3.5-turbo
MAX_TOKENS=1000
TEMPERATURE=0.1
```

## 🤝 Contributing

1. Follow the existing code structure
2. Add proper error handling
3. Update tests for new features
4. Document API changes
5. Test WebSocket functionality

## 📄 License

This project is part of the AI Dev Camp and is intended for educational and development purposes.

---

## 🆘 Need Help?

Check the implementation guide (`IMPLEMENTATION_GUIDE.md`) for detailed technical specifications and development phases.

For specific issues:
1. Check the health endpoint
2. Review server logs
3. Test individual components
4. Verify environment configuration
