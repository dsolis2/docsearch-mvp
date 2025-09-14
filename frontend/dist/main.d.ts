/**
 * RAG Chat Frontend - Main Entry Point
 *
 * This module initializes the RAG Chat system and exports the main API
 * for integration with WordPress and other platforms.
 */
import './styles/components.css';
import './components/index';
/**
 * Main RAG Chat class for programmatic access
 */
export declare class RAGChat {
    private container;
    private chatInterface;
    constructor(container: HTMLElement | string, config?: any);
    private init;
    private setupEventListeners;
    private onMessageSend;
    private onCitationClick;
    private onConnectionStatusChange;
    clearMessages(): void;
    getMessages(): any;
    getSessionId(): any;
    destroy(): void;
}
/**
 * Initialize RAG Chat with simple API
 */
export declare function createRAGChat(container: HTMLElement | string, config?: any): RAGChat;
export default RAGChat;
export * from './components/index';
/**
 * Usage Examples:
 *
 * 1. Basic Usage:
 *    import RAGChat from './path/to/rag-chat';
 *    const chat = new RAGChat('#chat-container');
 *
 * 2. With Configuration:
 *    const chat = new RAGChat('#chat-container', {
 *      wsEndpoint: 'ws://localhost:8000/ws',
 *      enableCitations: true,
 *      enableStreaming: true
 *    });
 *
 * 3. Global Access (after script load):
 *    const chat = window.RAGChat.create('#chat-container');
 */
//# sourceMappingURL=main.d.ts.map