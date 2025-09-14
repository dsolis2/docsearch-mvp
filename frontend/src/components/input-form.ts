import { debounce } from '../utils/dom-helpers';

export class RAGInputForm extends HTMLElement {
  private _shadowRoot: ShadowRoot;
  private textarea!: HTMLTextAreaElement; // Definite assignment assertion
  private submitButton!: HTMLButtonElement; // Definite assignment assertion
  private isEnabled = true;
  private isSubmitting = false;
  
  constructor() {
    super();
    this._shadowRoot = this.attachShadow({ mode: 'open' });
    this.setupComponent();
  }
  
  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }
  
  private setupComponent() {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        border-top: 1px solid var(--rag-border-color, #e2e8f0);
        background: var(--rag-background-color, #ffffff);
      }
      
      .input-form {
        display: flex;
        padding: var(--rag-spacing-md, 1rem);
        gap: var(--rag-spacing-sm, 0.5rem);
        align-items: flex-end;
      }
      
      .input-wrapper {
        flex: 1;
        position: relative;
      }
      
      .textarea {
        width: 100%;
        resize: none;
        border: 1px solid var(--rag-border-color, #e2e8f0);
        border-radius: var(--rag-border-radius, 0.5rem);
        padding: var(--rag-spacing-sm, 0.5rem) var(--rag-spacing-md, 1rem);
        font-family: inherit;
        font-size: var(--rag-font-size-base, 1rem);
        line-height: 1.5;
        min-height: 2.5rem;
        max-height: 8rem;
        transition: all 0.2s ease;
        outline: none;
        background: var(--rag-background-color, #ffffff);
        color: var(--rag-text-primary, #1e293b);
      }
      
      .textarea:focus {
        border-color: var(--rag-primary-color, #2563eb);
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
      }
      
      .textarea:disabled {
        background: var(--rag-surface-color, #f8fafc);
        color: var(--rag-text-muted, #94a3b8);
        cursor: not-allowed;
      }
      
      .textarea::placeholder {
        color: var(--rag-text-muted, #94a3b8);
      }
      
      .submit-button {
        padding: var(--rag-spacing-sm, 0.5rem) var(--rag-spacing-md, 1rem);
        background: var(--rag-primary-color, #2563eb);
        color: white;
        border: none;
        border-radius: var(--rag-border-radius, 0.5rem);
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
        min-width: 4rem;
        height: 2.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        white-space: nowrap;
      }
      
      .submit-button:hover:not(:disabled) {
        background: #1d4ed8;
        transform: translateY(-1px);
      }
      
      .submit-button:active {
        transform: translateY(0);
      }
      
      .submit-button:disabled {
        background: var(--rag-text-muted, #94a3b8);
        cursor: not-allowed;
        transform: none;
      }
      
      .submit-button--loading {
        pointer-events: none;
      }
      
      .spinner {
        width: 1rem;
        height: 1rem;
        border: 2px solid currentColor;
        border-radius: 50%;
        border-top-color: transparent;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
      
      .char-counter {
        position: absolute;
        bottom: 0.5rem;
        right: 0.75rem;
        font-size: 0.75rem;
        color: var(--rag-text-muted, #94a3b8);
        background: var(--rag-background-color, #ffffff);
        padding: 0 0.25rem;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      
      .char-counter--visible {
        opacity: 1;
      }
      
      .char-counter--warning {
        color: var(--rag-warning-color, #d97706);
      }
      
      .char-counter--error {
        color: var(--rag-error-color, #dc2626);
      }
      
      .keyboard-hint {
        font-size: 0.75rem;
        color: var(--rag-text-muted, #94a3b8);
        margin-top: 0.25rem;
        text-align: center;
        opacity: 0.7;
      }
      
      @media (max-width: 640px) {
        .input-form {
          padding: var(--rag-spacing-sm, 0.5rem);
        }
        
        .keyboard-hint {
          display: none;
        }
      }
    `;
    
    this._shadowRoot.appendChild(style);
  }
  
  private render() {
    const container = document.createElement('div');
    container.className = 'input-form';
    
    // Input wrapper
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'input-wrapper';
    
    // Textarea
    this.textarea = document.createElement('textarea');
    this.textarea.className = 'textarea';
    this.textarea.placeholder = 'Ask me anything about your documents...';
    this.textarea.rows = 1;
    this.textarea.setAttribute('aria-label', 'Message input');
    
    // Character counter
    const charCounter = document.createElement('div');
    charCounter.className = 'char-counter';
    charCounter.setAttribute('aria-live', 'polite');
    
    inputWrapper.appendChild(this.textarea);
    inputWrapper.appendChild(charCounter);
    
    // Submit button
    this.submitButton = document.createElement('button');
    this.submitButton.className = 'submit-button';
    this.submitButton.type = 'submit';
    this.submitButton.setAttribute('aria-label', 'Send message');
    this.submitButton.innerHTML = `
      <span class="button-text">Send</span>
    `;
    
    container.appendChild(inputWrapper);
    container.appendChild(this.submitButton);
    
    // Keyboard hint
    const keyboardHint = document.createElement('div');
    keyboardHint.className = 'keyboard-hint';
    keyboardHint.textContent = 'Press Enter to send, Shift+Enter for new line';
    
    const wrapper = document.createElement('div');
    wrapper.appendChild(container);
    wrapper.appendChild(keyboardHint);
    
    this._shadowRoot.appendChild(wrapper);
  }
  
  private setupEventListeners() {
    // Auto-resize textarea
    this.textarea.addEventListener('input', () => {
      this.autoResize();
      this.updateCharCounter();
    });
    
    // Handle keyboard shortcuts
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleSubmit();
      }
      
      // Handle Escape to clear
      if (e.key === 'Escape') {
        this.textarea.value = '';
        this.autoResize();
        this.updateCharCounter();
      }
    });
    
    // Submit button
    this.submitButton.addEventListener('click', () => {
      this.handleSubmit();
    });
    
    // Focus management
    this.textarea.addEventListener('focus', () => {
      this.showCharCounter();
    });
    
    this.textarea.addEventListener('blur', debounce(() => {
      if (!this.textarea.value.trim()) {
        this.hideCharCounter();
      }
    }, 1000));
  }
  
  private autoResize() {
    // Reset height to auto to get the correct scrollHeight
    this.textarea.style.height = 'auto';
    
    // Calculate the new height
    const maxHeight = 8 * 1.5 * 16; // 8rem in pixels (approximate)
    const newHeight = Math.min(this.textarea.scrollHeight, maxHeight);
    
    this.textarea.style.height = `${newHeight}px`;
  }
  
  private updateCharCounter() {
    const charCounter = this._shadowRoot.querySelector('.char-counter') as HTMLElement;
    const length = this.textarea.value.length;
    const maxLength = 2000; // Reasonable limit for chat messages
    
    charCounter.textContent = `${length}/${maxLength}`;
    
    // Update styling based on length
    charCounter.classList.remove('char-counter--warning', 'char-counter--error');
    
    if (length > maxLength * 0.9) {
      charCounter.classList.add('char-counter--error');
    } else if (length > maxLength * 0.8) {
      charCounter.classList.add('char-counter--warning');
    }
    
    // Disable submit if over limit
    this.submitButton.disabled = length > maxLength || length === 0 || !this.isEnabled || this.isSubmitting;
  }
  
  private showCharCounter() {
    const charCounter = this._shadowRoot.querySelector('.char-counter') as HTMLElement;
    charCounter.classList.add('char-counter--visible');
  }
  
  private hideCharCounter() {
    const charCounter = this._shadowRoot.querySelector('.char-counter') as HTMLElement;
    charCounter.classList.remove('char-counter--visible');
  }
  
  private handleSubmit() {
    const message = this.textarea.value.trim();
    
    if (!message || !this.isEnabled || this.isSubmitting) {
      return;
    }
    
    // Set loading state
    this.setSubmitting(true);
    
    // Emit the message event
    const event = new CustomEvent('rag-message-send', {
      detail: { message },
      bubbles: true
    });
    this.dispatchEvent(event);
    
    // Clear the input
    this.textarea.value = '';
    this.autoResize();
    this.updateCharCounter();
    this.hideCharCounter();
    
    // Reset loading state after a delay
    setTimeout(() => {
      this.setSubmitting(false);
    }, 500);
  }
  
  private setSubmitting(submitting: boolean) {
    this.isSubmitting = submitting;
    
    if (submitting) {
      this.submitButton.classList.add('submit-button--loading');
      this.submitButton.innerHTML = `
        <div class="spinner"></div>
        <span class="button-text">Sending...</span>
      `;
    } else {
      this.submitButton.classList.remove('submit-button--loading');
      this.submitButton.innerHTML = `
        <span class="button-text">Send</span>
      `;
    }
    
    this.updateButtonState();
  }
  
  private updateButtonState() {
    const hasText = this.textarea.value.trim().length > 0;
    const isOverLimit = this.textarea.value.length > 2000;
    
    this.submitButton.disabled = !hasText || !this.isEnabled || this.isSubmitting || isOverLimit;
  }
  
  // Public API
  public focus() {
    this.textarea.focus();
  }
  
  public setValue(value: string) {
    this.textarea.value = value;
    this.autoResize();
    this.updateCharCounter();
  }
  
  public getValue(): string {
    return this.textarea.value;
  }
  
  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    this.textarea.disabled = !enabled;
    this.updateButtonState();
    
    if (enabled) {
      this.textarea.placeholder = 'Ask me anything about your documents...';
    } else {
      this.textarea.placeholder = 'Connecting to server...';
    }
  }
  
  public clear() {
    this.textarea.value = '';
    this.autoResize();
    this.updateCharCounter();
    this.hideCharCounter();
  }
}

// Register the custom element
customElements.define('rag-input-form', RAGInputForm);