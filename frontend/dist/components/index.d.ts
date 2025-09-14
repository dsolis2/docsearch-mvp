/**
 * RAG Chat Components - Web Components for the RAG Chat system
 *
 * This module exports all the Web Components used in the RAG Chat interface.
 * Each component is designed to be used independently or as part of the complete system.
 */
import './chat-interface';
import './message-list';
import './input-form';
import './citation-panel';
export { RAGChatInterface } from './chat-interface';
export { RAGMessageList } from './message-list';
export { RAGInputForm } from './input-form';
export { RAGCitationPanel } from './citation-panel';
export type { Message, Citation, ChatSession, MessageDelta } from '../types/message.types';
export type { WebSocketMessage, ChatRequest, ChatResponse } from '../types/api.types';
/**
 * Component Usage Guide:
 *
 * 1. Main Chat Interface:
 *    <rag-chat-interface></rag-chat-interface>
 *    This is the primary component that includes all child components.
 *
 * 2. Individual Components (for custom layouts):
 *    <rag-message-list></rag-message-list>
 *    <rag-input-form></rag-input-form>
 *    <rag-citation-panel></rag-citation-panel>
 *
 * 3. Programmatic Access:
 *    import { RAGChatInterface } from '@/components';
 *    const chatInterface = document.querySelector('rag-chat-interface') as RAGChatInterface;
 *    chatInterface.clearMessages();
 *
 * 4. Custom Events:
 *    - rag-message-send: User sends a message
 *    - rag-citations-received: Citations available for display
 *    - rag-connection-status: WebSocket connection status change
 *    - rag-citation-clicked: User clicks on a citation
 */
/**
 * Initialize components with custom configuration
 */
export interface RAGChatConfig {
    wsEndpoint?: string;
    maxMessageLength?: number;
    enableCitations?: boolean;
    enableStreaming?: boolean;
    model?: string;
}
/**
 * Apply global configuration to RAG Chat components
 */
export declare function configureRAGChat(config?: RAGChatConfig): void;
/**
 * Get current configuration
 */
export declare function getRAGChatConfig(): RAGChatConfig;
//# sourceMappingURL=index.d.ts.map