/**
 * RAG Chat Components - Web Components for the RAG Chat system
 * 
 * This module exports all the Web Components used in the RAG Chat interface.
 * Each component is designed to be used independently or as part of the complete system.
 */

// Import and register all components
import './chat-interface';
import './message-list';
import './input-form';
import './citation-panel';

// Re-export component classes for programmatic access
export { RAGChatInterface } from './chat-interface';
export { RAGMessageList } from './message-list';
export { RAGInputForm } from './input-form';
export { RAGCitationPanel } from './citation-panel';

// Type exports
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
  model?: string; // Always 'gpt-4o-mini'
}

/**
 * Apply global configuration to RAG Chat components
 */
export function configureRAGChat(config: RAGChatConfig = {}) {
  // Set default light theme CSS custom properties
  const root = document.documentElement;
  root.style.setProperty('--rag-background-color', '#ffffff');
  root.style.setProperty('--rag-surface-color', '#f8fafc');
  root.style.setProperty('--rag-text-primary', '#1e293b');
  root.style.setProperty('--rag-text-secondary', '#64748b');
  root.style.setProperty('--rag-border-color', '#e2e8f0');
  
  // Always use GPT-4o-mini model
  config.model = 'gpt-4o-mini';
  
  // Store config for components to access
  (window as any).RAGChatConfig = config;
}

/**
 * Get current configuration
 */
export function getRAGChatConfig(): RAGChatConfig {
  return (window as any).RAGChatConfig || {};
}