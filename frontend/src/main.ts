/**
 * RAG Chat Frontend - Main Entry Point
 * 
 * This module initializes the RAG Chat system and exports the main API
 * for integration with WordPress and other platforms.
 */

import './styles/components.css';
import { configureRAGChat, getRAGChatConfig } from './components/index';

// Import all components to register them
import './components/index';

/**
 * Main RAG Chat class for programmatic access
 */
export class RAGChat {
  private container: HTMLElement;
  private chatInterface!: HTMLElement; // Definite assignment assertion
  
  constructor(container: HTMLElement | string, config: any = {}) {
    // Get container element
    if (typeof container === 'string') {
      const element = document.querySelector(container);
      if (!element) {
        throw new Error(`RAGChat: Container element "${container}" not found`);
      }
      this.container = element as HTMLElement;
    } else {
      this.container = container;
    }
    
    // Apply configuration
    configureRAGChat(config);
    
    // Initialize chat interface
    this.init();
  }
  
  private init() {
    // Create chat interface element
    this.chatInterface = document.createElement('rag-chat-interface');
    
    // Apply container styling
    this.container.style.height = this.container.style.height || '600px';
    this.container.style.width = this.container.style.width || '100%';
    
    // Add chat interface to container
    this.container.appendChild(this.chatInterface);
    
    // Set up event listeners for external integration
    this.setupEventListeners();
  }
  
  private setupEventListeners() {
    // Listen for messages to enable external handling
    this.chatInterface.addEventListener('rag-message-send', ((event: CustomEvent) => {
      this.onMessageSend(event.detail);
    }) as EventListener);
    
    // Listen for citation clicks
    this.chatInterface.addEventListener('rag-citation-clicked', ((event: CustomEvent) => {
      this.onCitationClick(event.detail);
    }) as EventListener);
    
    // Listen for connection status changes
    this.chatInterface.addEventListener('rag-connection-status', ((event: CustomEvent) => {
      this.onConnectionStatusChange(event.detail);
    }) as EventListener);
  }
  
  private onMessageSend(detail: { message: string }) {
    // Emit external event for WordPress integration
    const event = new CustomEvent('ragchat:message-send', {
      detail,
      bubbles: true
    });
    document.dispatchEvent(event);
  }
  
  private onCitationClick(detail: { citation: any; index: number }) {
    // Emit external event for WordPress integration
    const event = new CustomEvent('ragchat:citation-click', {
      detail,
      bubbles: true
    });
    document.dispatchEvent(event);
  }
  
  private onConnectionStatusChange(detail: { status: string }) {
    // Emit external event for WordPress integration
    const event = new CustomEvent('ragchat:connection-status', {
      detail,
      bubbles: true
    });
    document.dispatchEvent(event);
  }
  
  // Public API methods
  public clearMessages() {
    if (this.chatInterface) {
      (this.chatInterface as any).clearMessages();
    }
  }
  
  public getMessages() {
    if (this.chatInterface) {
      return (this.chatInterface as any).getMessages();
    }
    return [];
  }
  
  public getSessionId() {
    if (this.chatInterface) {
      return (this.chatInterface as any).getSessionId();
    }
    return null;
  }
  
  public destroy() {
    if (this.chatInterface) {
      this.chatInterface.remove();
    }
  }
}

/**
 * Initialize RAG Chat with simple API
 */
export function createRAGChat(container: HTMLElement | string, config: any = {}) {
  return new RAGChat(container, config);
}

/**
 * Global initialization
 */
function initGlobal() {
  // Make available globally
  (window as any).RAGChat = {
    create: createRAGChat,
    configure: configureRAGChat,
    getConfig: getRAGChatConfig
  };
  
  // Emit ready event
  document.addEventListener('DOMContentLoaded', () => {
    const event = new CustomEvent('ragchat:ready', {
      detail: { version: '1.0.0' }
    });
    document.dispatchEvent(event);
  });
}

// Initialize global features
initGlobal();

// Export main API
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
