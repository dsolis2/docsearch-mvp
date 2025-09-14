# RAG System Implementation Guide

## Project Overview

Building a RAG (Retrieval-Augmented Generation) system with vanilla TypeScript frontend and FastAPI backend for WordPress plugin compatibility.

## Architecture

- **Frontend**: Vanilla TypeScript + Web Components (NO frameworks)
- **Backend**: FastAPI + WebSocket streaming + LlamaIndex
- **Database**: Weaviate (pre-populated by coworker)
- **Output**: Single JS bundle for WordPress integration

## File Structure to Create

```json
docsearch-mvp/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat-interface.ts      # Main chat container
│   │   │   ├── message-list.ts        # Message display
│   │   │   ├── input-form.ts          # User input
│   │   │   ├── citation-panel.ts      # Source citations
│   │   │   └── index.ts               # Export all components
│   │   ├── services/
│   │   │   ├── websocket-client.ts    # WebSocket connection
│   │   │   ├── state-manager.ts       # State management
│   │   │   ├── citation-handler.ts    # Citation logic
│   │   │   └── api-client.ts          # API calls
│   │   ├── types/
│   │   │   ├── message.types.ts       # Message interfaces
│   │   │   ├── citation.types.ts      # Citation interfaces
│   │   │   └── api.types.ts           # API interfaces
│   │   ├── utils/
│   │   │   ├── dom-helpers.ts         # DOM utilities
│   │   │   └── formatters.ts          # Text formatting
│   │   ├── styles/
│   │   │   └── components.css         # Component styles
│   │   └── main.ts                    # Entry point
│   ├── public/
│   │   └── index.html                 # Demo page
│   ├── webpack.config.js              # Build config
│   ├── tsconfig.json                  # TypeScript config
│   └── package.json                   # Dependencies
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app
│   │   ├── websockets/
│   │   │   ├── chat_handler.py        # Chat logic
│   │   │   └── session_manager.py     # Sessions
│   │   ├── services/
│   │   │   ├── llm_service.py         # LLM providers
│   │   │   ├── vector_service.py      # Weaviate client
│   │   │   └── citation_service.py    # Citation extraction
│   │   ├── models/
│   │   │   ├── chat_models.py         # Pydantic models
│   │   │   └── response_models.py     # Response schemas
│   │   └── config/
│   │       └── settings.py            # Configuration
│   ├── requirements.txt               # Python deps
│   └── .env.example                   # Env template
├── wordpress-plugin/
│   ├── rag-chat-plugin.php           # Main plugin
│   ├── assets/                        # Built assets
│   └── includes/                      # Plugin classes
└── README.md
```

## Implementation Phases

### Phase 1: Project Setup (Start Here)

1. Create directory structure above
2. Set up package.json with dependencies:

   ```json
   {
     "name": "docsearch-mvp",
     "scripts": {
       "dev": "webpack serve --mode development",
       "build": "webpack --mode production"
     },
     "devDependencies": {
       "typescript", "webpack", "webpack-cli", "webpack-dev-server",
       "ts-loader", "css-loader", "style-loader", "mini-css-extract-plugin"
     }
   }
   ```

3. Configure webpack.config.js for single bundle output
4. Set up tsconfig.json with ES2020+ target
5. Create backend requirements.txt with:

   ```json
   fastapi
   uvicorn
   websockets
   llama-index
   weaviate-client
   openai
   anthropic
   python-dotenv
   ```

### Phase 2: Web Components Foundation

1. Create base component class with Shadow DOM
2. Implement `<rag-chat-interface>` as main container
3. Build WebSocket client service
4. Set up state management system
5. Create basic HTML demo page

### Phase 3: Backend Core

1. Set up FastAPI with WebSocket endpoint: `/ws/chat/{session_id}`
2. Implement session management
3. Create Weaviate client service
4. Add LlamaIndex integration
5. Build multi-LLM provider support

### Phase 4: Chat Interface

1. Implement streaming message display
2. Create user input form with validation
3. Add citation panel for source documents
4. Build conversation history
5. Add error handling and reconnection

### Phase 5: WordPress Plugin

1. Create plugin PHP structure
2. Add shortcode support: `[rag_chat]`
3. Build admin settings page
4. Package assets for distribution

## Key Technical Requirements

### Web Components Pattern

```typescript
class RAGChatInterface extends HTMLElement {
  private shadow: ShadowRoot;
  
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }
  
  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }
  
  static get observedAttributes() {
    return ['api-endpoint', 'theme'];
  }
}

customElements.define('rag-chat-interface', RAGChatInterface);
```

### WebSocket Streaming

- Connect to `ws://localhost:8000/ws/chat/{session_id}`
- Handle message types: `content_chunk`, `citations`, `message_complete`, `error`
- Implement auto-reconnection logic
- Stream responses token by token

### Weaviate Integration

Expected data schema from coworker:

```json
{
  "content": "document chunk text",
  "source_file_id": "google_drive_file_id", 
  "source_file_url": "https://drive.google.com/file/d/...",
  "metadata": {
    "file_name": "document.pdf",
    "chunk_index": 0,
    "section_title": "Introduction"
  }
}
```

### Build Output

- Single JS bundle: `dist/rag-system.min.js`
- Single CSS bundle: `dist/rag-system.min.css`  
- WordPress-ready assets in `wordpress-plugin/assets/`

## Current TODO Status

- [COMPLETED ✅] Set up project structure with TypeScript and Webpack configuration in docsearch-mvp directory
- [COMPLETED ✅] Implement base Web Component architecture for chat system
- [COMPLETED ✅] Create FastAPI backend with WebSocket streaming support
- [COMPLETED ✅] Build LlamaIndex integration with Weaviate vector database
- [COMPLETED ✅] Develop chat interface components (message list, input form, citations)
- [IN PROGRESS 🔄] Fix TypeScript compilation errors in frontend components
- [PENDING 📋] Implement real-time streaming and WebSocket client integration
- [PENDING 📋] Create WordPress plugin structure and shortcode integration
- [COMPLETED ✅] Build demo HTML page for MVP testing

## Next Steps for New Agent

1. Use code-implementer agent to start with Phase 1
2. Create the directory structure first
3. Set up build system (webpack + TypeScript)
4. Begin Web Components implementation
5. Test with simple demo page before moving to backend

## Important Notes

- NO React/Vue/Angular - pure vanilla TypeScript only
- Use Shadow DOM for component isolation
- Focus on WordPress plugin compatibility
- Coworker handles: Google Drive → MarkItDown → Chunky → VoyageAI → Weaviate
- You handle: Weaviate → LlamaIndex → LLM → Frontend
