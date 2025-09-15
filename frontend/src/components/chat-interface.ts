import '../styles/components.css';
import { generateId } from '../utils/dom-helpers';
import type { Message } from '../types/message.types';
import { WebSocketClient } from '../services/websocket-client';

export class RAGChatInterface extends HTMLElement {
  private _shadowRoot: ShadowRoot;
  private sessionId: string;
  private messages: Message[] = [];
  private _isConnected = false;
  private wsClient: WebSocketClient;
  
  // Child components
  private messageList?: HTMLElement;
  private inputForm?: HTMLElement;
  private citationPanel?: HTMLElement;
  
  constructor() {
    super();
    this._shadowRoot = this.attachShadow({ mode: 'open' });
    this.sessionId = generateId('session');
    
    // Initialize WebSocket client
    this.wsClient = new WebSocketClient({
      url: `ws://localhost:8000/ws/${this.sessionId}`
    });
    
    this.setupComponent();
    this.setupWebSocketListeners();
  }
  
  connectedCallback() {
    this.render();
    this.setupEventListeners();
    
    // Connect to WebSocket
    this.connectWebSocket();
    
    // Auto-focus input when connected
    setTimeout(() => {
      const input = this._shadowRoot.querySelector('rag-input-form');
      if (input) {
        (input as any).focus();
      }
    }, 100);
  }
  
  disconnectedCallback() {
    this.cleanup();
    // Disconnect WebSocket
    if (this.wsClient) {
      this.wsClient.disconnect();
    }
  }
  
  private setupComponent() {
    // Add CSS
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        font-family: var(--rag-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
      }
      
      .chat-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--rag-background-color, #ffffff);
        border: 1px solid var(--rag-border-color, #e2e8f0);
        border-radius: var(--rag-border-radius, 0.5rem);
        overflow: hidden;
        box-shadow: var(--rag-shadow-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1));
      }
      
      .chat-header {
        padding: 1rem;
        border-bottom: 1px solid var(--rag-border-color, #e2e8f0);
        background: var(--rag-surface-color, #f8fafc);
      }
      
      .chat-title {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--rag-text-primary, #1e293b);
      }
      
      .chat-status {
        font-size: 0.875rem;
        color: var(--rag-text-secondary, #64748b);
        margin-top: 0.25rem;
      }
      
      .connection-indicator {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 0.5rem;
      }
      
      .connection-indicator--connected {
        background-color: var(--rag-success-color, #059669);
      }
      
      .connection-indicator--disconnected {
        background-color: var(--rag-error-color, #dc2626);
      }
      
      .connection-indicator--connecting {
        background-color: var(--rag-warning-color, #d97706);
        animation: pulse 1.5s ease-in-out infinite;
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `;
    
    this._shadowRoot.appendChild(style);
  }
  
  private render() {
    const container = document.createElement('div');
    container.className = 'chat-container';
    
    // Header
    const header = document.createElement('div');
    header.className = 'chat-header';
    header.innerHTML = `
      <h2 class="chat-title">RAG Chat Assistant</h2>
      <div class="chat-status">
        <span class="connection-indicator connection-indicator--disconnected"></span>
        <span class="status-text">Disconnected</span>
      </div>
    `;
    
    // Message List
    const messageList = document.createElement('rag-message-list');
    messageList.setAttribute('session-id', this.sessionId);
    this.messageList = messageList;
    
    // Citation Panel (initially hidden)
    const citationPanel = document.createElement('rag-citation-panel');
    citationPanel.style.display = 'none';
    this.citationPanel = citationPanel;
    
    // Input Form
    const inputForm = document.createElement('rag-input-form');
    inputForm.setAttribute('session-id', this.sessionId);
    this.inputForm = inputForm;
    
    container.appendChild(header);
    container.appendChild(messageList);
    container.appendChild(citationPanel);
    container.appendChild(inputForm);
    
    this._shadowRoot.appendChild(container);
  }
  
  private setupEventListeners() {
    console.log('ChatInterface: Setting up event listeners');
    
    // Listen for message events from input form
    this.addEventListener('rag-message-send', this.handleMessageSend.bind(this) as EventListener);
    console.log('ChatInterface: Added rag-message-send listener');
    
    // Listen for citation events from message list
    this.addEventListener('rag-citations-received', this.handleCitationsReceived.bind(this) as EventListener);
    console.log('ChatInterface: Added rag-citations-received listener');
    
    // Listen for WebSocket connection events
    this.addEventListener('rag-connection-status', this.handleConnectionStatus.bind(this) as EventListener);
    console.log('ChatInterface: Added rag-connection-status listener');
  }
  
  private handleMessageSend(event: CustomEvent) {
    const { message } = event.detail;
    console.log('ChatInterface: Handling message send:', message);
    
    // Add user message immediately
    const userMessage: Message = {
      id: generateId('msg'),
      role: 'user',
      content: message,
      timestamp: new Date(),
      status: 'sent'
    };
    
    console.log('ChatInterface: Adding user message:', userMessage);
    this.addMessage(userMessage);
    
    // Create placeholder for assistant response
    const assistantMessage: Message = {
      id: generateId('msg'),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      status: 'streaming'
    };
    
    console.log('ChatInterface: Adding assistant message:', assistantMessage);
    this.addMessage(assistantMessage);
    
    // Send to backend
    this.sendToBackend(message, assistantMessage.id);
  }
  
  private handleCitationsReceived(event: CustomEvent) {
    const { citations } = event.detail;
    
    if (citations && citations.length > 0) {
      // Show citation panel
      if (this.citationPanel) {
        this.citationPanel.style.display = 'block';
        (this.citationPanel as any).setCitations(citations);
      }
    }
  }
  
  private handleConnectionStatus(event: CustomEvent) {
    const { status } = event.detail;
    this.updateConnectionStatus(status);
  }
  
  private addMessage(message: Message) {
    console.log('ChatInterface: addMessage called with:', message);
    console.log('ChatInterface: messageList exists?', !!this.messageList);
    this.messages.push(message);
    if (this.messageList) {
      console.log('ChatInterface: Calling addMessage on messageList');
      (this.messageList as any).addMessage(message);
    } else {
      console.error('ChatInterface: messageList is not available!');
    }
  }
  
  private updateConnectionStatus(status: 'connected' | 'connecting' | 'disconnected') {
    this._isConnected = status === 'connected';
    
    const indicator = this._shadowRoot.querySelector('.connection-indicator');
    const statusText = this._shadowRoot.querySelector('.status-text');
    
    if (indicator && statusText) {
      indicator.className = `connection-indicator connection-indicator--${status}`;
      statusText.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    }
    
    // Enable/disable input based on connection
    this.updateInputFormState();
  }
  
  private sendToBackend(message: string, messageId: string) {
    // Send message via WebSocket
    if (this.wsClient && this.wsClient.isConnected()) {
      this.wsClient.sendChatMessage(message, this.sessionId);
    } else {
      console.error('WebSocket not connected, cannot send message');
      
      // Update message with error state
      const message = this.messages.find(m => m.id === messageId);
      if (message) {
        message.content = 'Error: Not connected to backend. Please check your connection.';
        message.status = 'error';
        
        if (this.messageList) {
          (this.messageList as any).updateMessage(message);
        }
      }
    }
  }
  
  private setupWebSocketListeners() {
    // Listen for WebSocket events
    this.wsClient.on('connected', () => {
      this.updateConnectionStatus('connected');
    });
    
    this.wsClient.on('disconnected', () => {
      this.updateConnectionStatus('disconnected');
    });
    
    this.wsClient.on('messageChunk', (data) => {
      // Handle streaming message updates
      console.log('ChatInterface: messageChunk event received:', data);
      
      // Find the last assistant message (the one we're streaming to)
      const lastAssistantMessage = [...this.messages].reverse().find(m => m.role === 'assistant' && m.status === 'streaming');
      
      if (lastAssistantMessage && this.messageList) {
        console.log('ChatInterface: Updating assistant message:', lastAssistantMessage.id, 'with chunk:', data.chunk);
        // Use the correct assistant message ID from our messages array
        (this.messageList as any).updateStreamingMessage(lastAssistantMessage.id, data.chunk);
        
        // Note: Don't update local message content here as streamMessageUpdate handles it
      } else {
        console.warn('ChatInterface: No streaming assistant message found or messageList not available');
      }
    });
    
    this.wsClient.on('messageComplete', (data) => {
      // Handle message completion
      if (this.messageList) {
        (this.messageList as any).completeMessage(data.messageId);
      }
    });
    
    this.wsClient.on('citations', (data) => {
      // Handle citations
      this.handleCitationsReceived(new CustomEvent('rag-citations-received', {
        detail: { citations: data.citations }
      }));
    });
    
    this.wsClient.on('serverError', (data) => {
      console.error('Server error:', data);
      // Show error message to user
      this.addMessage({
        id: generateId('msg'),
        role: 'assistant',
        content: `Error: ${data.error || 'Something went wrong'}`,
        timestamp: new Date(),
        status: 'error'
      });
    });
  }
  
  private async connectWebSocket() {
    try {
      this.updateConnectionStatus('connecting');
      await this.wsClient.connect();
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.updateConnectionStatus('disconnected');
    }
  }
  
  private updateInputFormState() {
    // Wait for the input form element to be fully initialized
    setTimeout(() => {
      if (this.inputForm && typeof (this.inputForm as any).setEnabled === 'function') {
        (this.inputForm as any).setEnabled(this._isConnected);
      }
    }, 100);
  }
  
  private cleanup() {
    // Clean up WebSocket connection
    if (this.wsClient) {
      this.wsClient.disconnect();
    }
  }
  
  // Public API
  public getSessionId(): string {
    return this.sessionId;
  }
  
  public getMessages(): Message[] {
    return [...this.messages];
  }
  
  public clearMessages() {
    this.messages = [];
    if (this.messageList) {
      (this.messageList as any).clearMessages();
    }
    if (this.citationPanel) {
      this.citationPanel.style.display = 'none';
    }
  }
}

// Register the custom element
if (!customElements.get('rag-chat-interface')) {
  customElements.define('rag-chat-interface', RAGChatInterface);
}
