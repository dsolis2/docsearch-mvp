import { formatTimestamp, escapeHtml } from '../utils/dom-helpers';
import type { Message } from '../types/message.types';

export class RAGMessageList extends HTMLElement {
  private _shadowRoot: ShadowRoot;
  private messages: Message[] = [];
  private messageContainer!: HTMLDivElement; // Definite assignment assertion
  
  constructor() {
    super();
    this._shadowRoot = this.attachShadow({ mode: 'open' });
    this.setupComponent();
  }
  
  connectedCallback() {
    this.render();
  }
  
  private setupComponent() {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        flex: 1;
        overflow-y: auto;
        background: var(--rag-surface-color, #f8fafc);
      }
      
      .message-container {
        padding: var(--rag-spacing-md, 1rem);
        min-height: 100%;
        display: flex;
        flex-direction: column;
      }
      
      .message {
        margin-bottom: var(--rag-spacing-md, 1rem);
        display: flex;
        flex-direction: column;
        opacity: 0;
        transform: translateY(10px);
        animation: messageSlideIn 0.3s ease-out forwards;
      }
      
      @keyframes messageSlideIn {
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .message--user {
        align-items: flex-end;
      }
      
      .message--assistant {
        align-items: flex-start;
      }
      
      .message__content {
        max-width: 80%;
        padding: var(--rag-spacing-sm, 0.5rem) var(--rag-spacing-md, 1rem);
        border-radius: var(--rag-border-radius, 0.5rem);
        word-wrap: break-word;
        white-space: pre-wrap;
        line-height: 1.5;
        position: relative;
      }
      
      .message--user .message__content {
        background: var(--rag-primary-color, #2563eb);
        color: white;
        border-bottom-right-radius: var(--rag-border-radius-sm, 0.25rem);
      }
      
      .message--assistant .message__content {
        background: var(--rag-background-color, #ffffff);
        border: 1px solid var(--rag-border-color, #e2e8f0);
        color: var(--rag-text-primary, #1e293b);
        border-bottom-left-radius: var(--rag-border-radius-sm, 0.25rem);
      }
      
      .message__meta {
        font-size: var(--rag-font-size-sm, 0.875rem);
        color: var(--rag-text-muted, #94a3b8);
        margin-top: var(--rag-spacing-xs, 0.25rem);
        padding: 0 var(--rag-spacing-sm, 0.5rem);
        display: flex;
        align-items: center;
        gap: var(--rag-spacing-sm, 0.5rem);
      }
      
      .message__timestamp {
        opacity: 0.7;
      }
      
      .message__status {
        font-style: italic;
      }
      
      .message--streaming .message__content::after {
        content: "▋";
        animation: cursorBlink 1s infinite;
        color: var(--rag-primary-color, #2563eb);
      }
      
      .message--user.message--streaming .message__content::after {
        color: rgba(255, 255, 255, 0.8);
      }
      
      @keyframes cursorBlink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
      }
      
      .message--error .message__content {
        background: #fef2f2;
        border-color: #fecaca;
        color: var(--rag-error-color, #dc2626);
      }
      
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--rag-spacing-xl, 2rem);
        text-align: center;
        color: var(--rag-text-secondary, #64748b);
        flex: 1;
      }
      
      .empty-state__icon {
        font-size: 3rem;
        margin-bottom: var(--rag-spacing-md, 1rem);
        opacity: 0.5;
      }
      
      .empty-state__title {
        font-size: var(--rag-font-size-lg, 1.125rem);
        font-weight: 600;
        margin-bottom: var(--rag-spacing-sm, 0.5rem);
        color: var(--rag-text-primary, #1e293b);
      }
      
      .empty-state__message {
        max-width: 300px;
        line-height: 1.5;
      }
      
      .citation-indicators {
        margin-top: var(--rag-spacing-xs, 0.25rem);
        display: flex;
        gap: var(--rag-spacing-xs, 0.25rem);
        flex-wrap: wrap;
      }
      
      .citation-indicator {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.125rem 0.375rem;
        background: var(--rag-primary-color, #2563eb);
        color: white;
        border-radius: 0.75rem;
        font-size: 0.75rem;
        cursor: pointer;
        transition: background-color 0.2s ease;
      }
      
      .citation-indicator:hover {
        background: #1d4ed8;
      }
      
      .citation-count {
        font-weight: 600;
      }
    `;
    
    this._shadowRoot.appendChild(style);
  }
  
  private render() {
    this.messageContainer = document.createElement('div');
    this.messageContainer.className = 'message-container';
    
    this.renderMessages();
    this._shadowRoot.appendChild(this.messageContainer);
  }
  
  private renderMessages() {
    if (this.messages.length === 0) {
      this.renderEmptyState();
      return;
    }
    
    this.messageContainer.innerHTML = '';
    
    this.messages.forEach(message => {
      const messageElement = this.createMessageElement(message);
      this.messageContainer.appendChild(messageElement);
    });
    
    // Scroll to bottom
    this.scrollToBottom();
  }
  
  private renderEmptyState() {
    this.messageContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">💬</div>
        <div class="empty-state__title">Start a Conversation</div>
        <div class="empty-state__message">
          Ask me anything about your documents. I'll search through your knowledge base and provide relevant answers with citations.
        </div>
      </div>
    `;
  }
  
  private createMessageElement(message: Message): HTMLElement {
    const messageEl = document.createElement('div');
    messageEl.className = `message message--${message.role}`;
    messageEl.setAttribute('data-message-id', message.id);
    
    if (message.status) {
      messageEl.classList.add(`message--${message.status}`);
    }
    
    const contentEl = document.createElement('div');
    contentEl.className = 'message__content';
    contentEl.innerHTML = this.formatMessageContent(message.content);
    
    const metaEl = document.createElement('div');
    metaEl.className = 'message__meta';
    
    const timestampEl = document.createElement('span');
    timestampEl.className = 'message__timestamp';
    timestampEl.textContent = formatTimestamp(message.timestamp);
    
    metaEl.appendChild(timestampEl);
    
    // Add status if not completed
    if (message.status && message.status !== 'completed' && message.status !== 'sent') {
      const statusEl = document.createElement('span');
      statusEl.className = 'message__status';
      statusEl.textContent = this.getStatusText(message.status);
      metaEl.appendChild(statusEl);
    }
    
    messageEl.appendChild(contentEl);
    messageEl.appendChild(metaEl);
    
    // Add citations if available
    if (message.citations && message.citations.length > 0) {
      const citationIndicators = this.createCitationIndicators(message.citations);
      messageEl.appendChild(citationIndicators);
    }
    
    return messageEl;
  }
  
  private formatMessageContent(content: string): string {
    // Basic HTML escaping and line break handling
    let formatted = escapeHtml(content);
    
    // Convert newlines to HTML breaks (but preserve pre-wrap behavior)
    // This is mainly for display purposes
    return formatted;
  }
  
  private getStatusText(status: Message['status']): string {
    switch (status) {
      case 'sending':
        return 'Sending...';
      case 'streaming':
        return 'Typing...';
      case 'error':
        return 'Error';
      default:
        return '';
    }
  }
  
  private createCitationIndicators(citations: any[]): HTMLElement {
    const container = document.createElement('div');
    container.className = 'citation-indicators';
    
    const indicator = document.createElement('button');
    indicator.className = 'citation-indicator';
    indicator.innerHTML = `
      <span class="citation-count">${citations.length}</span>
      <span>source${citations.length > 1 ? 's' : ''}</span>
    `;
    
    indicator.addEventListener('click', () => {
      // Emit event to show citations
      const event = new CustomEvent('rag-citations-received', {
        detail: { citations },
        bubbles: true
      });
      this.dispatchEvent(event);
    });
    
    container.appendChild(indicator);
    return container;
  }
  
  private scrollToBottom() {
    // Use requestAnimationFrame to ensure the DOM is updated
    requestAnimationFrame(() => {
      this.scrollTop = this.scrollHeight;
    });
  }
  
  // Public API methods
  public addMessage(message: Message) {
    this.messages.push(message);
    this.renderMessages();
  }
  
  public updateMessage(updatedMessage: Message) {
    const index = this.messages.findIndex(m => m.id === updatedMessage.id);
    if (index !== -1) {
      this.messages[index] = updatedMessage;
      
      // Update just this message element instead of re-rendering all
      const messageElement = this._shadowRoot.querySelector(`[data-message-id="${updatedMessage.id}"]`);
      if (messageElement) {
        const newElement = this.createMessageElement(updatedMessage);
        messageElement.replaceWith(newElement);
      }
    }
  }
  
  public clearMessages() {
    this.messages = [];
    this.renderMessages();
  }
  
  public getMessages(): Message[] {
    return [...this.messages];
  }
  
  public streamMessageUpdate(messageId: string, contentDelta: string) {
    const message = this.messages.find(m => m.id === messageId);
    if (message) {
      message.content += contentDelta;
      
      // Update the content element directly for smooth streaming
      const messageElement = this._shadowRoot.querySelector(`[data-message-id="${messageId}"] .message__content`);
      if (messageElement) {
        messageElement.innerHTML = this.formatMessageContent(message.content);
      }
      
      // Ensure we stay scrolled to bottom during streaming
      this.scrollToBottom();
    }
  }
}

// Register the custom element
customElements.define('rag-message-list', RAGMessageList);