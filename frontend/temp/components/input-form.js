"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAGInputForm = void 0;
var dom_helpers_1 = require("../utils/dom-helpers");
var RAGInputForm = /** @class */ (function (_super) {
    __extends(RAGInputForm, _super);
    function RAGInputForm() {
        var _this = _super.call(this) || this;
        _this.isEnabled = true;
        _this.isSubmitting = false;
        _this._shadowRoot = _this.attachShadow({ mode: 'open' });
        _this.setupComponent();
        return _this;
    }
    RAGInputForm.prototype.connectedCallback = function () {
        this.render();
        this.setupEventListeners();
    };
    RAGInputForm.prototype.setupComponent = function () {
        var style = document.createElement('style');
        style.textContent = "\n      :host {\n        display: block;\n        border-top: 1px solid var(--rag-border-color, #e2e8f0);\n        background: var(--rag-background-color, #ffffff);\n      }\n      \n      .input-form {\n        display: flex;\n        padding: var(--rag-spacing-md, 1rem);\n        gap: var(--rag-spacing-sm, 0.5rem);\n        align-items: flex-end;\n      }\n      \n      .input-wrapper {\n        flex: 1;\n        position: relative;\n      }\n      \n      .textarea {\n        width: 100%;\n        resize: none;\n        border: 1px solid var(--rag-border-color, #e2e8f0);\n        border-radius: var(--rag-border-radius, 0.5rem);\n        padding: var(--rag-spacing-sm, 0.5rem) var(--rag-spacing-md, 1rem);\n        font-family: inherit;\n        font-size: var(--rag-font-size-base, 1rem);\n        line-height: 1.5;\n        min-height: 2.5rem;\n        max-height: 8rem;\n        transition: all 0.2s ease;\n        outline: none;\n        background: var(--rag-background-color, #ffffff);\n        color: var(--rag-text-primary, #1e293b);\n      }\n      \n      .textarea:focus {\n        border-color: var(--rag-primary-color, #2563eb);\n        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);\n      }\n      \n      .textarea:disabled {\n        background: var(--rag-surface-color, #f8fafc);\n        color: var(--rag-text-muted, #94a3b8);\n        cursor: not-allowed;\n      }\n      \n      .textarea::placeholder {\n        color: var(--rag-text-muted, #94a3b8);\n      }\n      \n      .submit-button {\n        padding: var(--rag-spacing-sm, 0.5rem) var(--rag-spacing-md, 1rem);\n        background: var(--rag-primary-color, #2563eb);\n        color: white;\n        border: none;\n        border-radius: var(--rag-border-radius, 0.5rem);\n        cursor: pointer;\n        font-weight: 500;\n        transition: all 0.2s ease;\n        min-width: 4rem;\n        height: 2.5rem;\n        display: flex;\n        align-items: center;\n        justify-content: center;\n        gap: 0.5rem;\n        white-space: nowrap;\n      }\n      \n      .submit-button:hover:not(:disabled) {\n        background: #1d4ed8;\n        transform: translateY(-1px);\n      }\n      \n      .submit-button:active {\n        transform: translateY(0);\n      }\n      \n      .submit-button:disabled {\n        background: var(--rag-text-muted, #94a3b8);\n        cursor: not-allowed;\n        transform: none;\n      }\n      \n      .submit-button--loading {\n        pointer-events: none;\n      }\n      \n      .spinner {\n        width: 1rem;\n        height: 1rem;\n        border: 2px solid currentColor;\n        border-radius: 50%;\n        border-top-color: transparent;\n        animation: spin 1s linear infinite;\n      }\n      \n      @keyframes spin {\n        to {\n          transform: rotate(360deg);\n        }\n      }\n      \n      .char-counter {\n        position: absolute;\n        bottom: 0.5rem;\n        right: 0.75rem;\n        font-size: 0.75rem;\n        color: var(--rag-text-muted, #94a3b8);\n        background: var(--rag-background-color, #ffffff);\n        padding: 0 0.25rem;\n        pointer-events: none;\n        opacity: 0;\n        transition: opacity 0.2s ease;\n      }\n      \n      .char-counter--visible {\n        opacity: 1;\n      }\n      \n      .char-counter--warning {\n        color: var(--rag-warning-color, #d97706);\n      }\n      \n      .char-counter--error {\n        color: var(--rag-error-color, #dc2626);\n      }\n      \n      .keyboard-hint {\n        font-size: 0.75rem;\n        color: var(--rag-text-muted, #94a3b8);\n        margin-top: 0.25rem;\n        text-align: center;\n        opacity: 0.7;\n      }\n      \n      @media (max-width: 640px) {\n        .input-form {\n          padding: var(--rag-spacing-sm, 0.5rem);\n        }\n        \n        .keyboard-hint {\n          display: none;\n        }\n      }\n    ";
        this._shadowRoot.appendChild(style);
    };
    RAGInputForm.prototype.render = function () {
        var container = document.createElement('div');
        container.className = 'input-form';
        // Input wrapper
        var inputWrapper = document.createElement('div');
        inputWrapper.className = 'input-wrapper';
        // Textarea
        this.textarea = document.createElement('textarea');
        this.textarea.className = 'textarea';
        this.textarea.placeholder = 'Ask me anything about your documents...';
        this.textarea.rows = 1;
        this.textarea.setAttribute('aria-label', 'Message input');
        // Character counter
        var charCounter = document.createElement('div');
        charCounter.className = 'char-counter';
        charCounter.setAttribute('aria-live', 'polite');
        inputWrapper.appendChild(this.textarea);
        inputWrapper.appendChild(charCounter);
        // Submit button
        this.submitButton = document.createElement('button');
        this.submitButton.className = 'submit-button';
        this.submitButton.type = 'submit';
        this.submitButton.setAttribute('aria-label', 'Send message');
        this.submitButton.innerHTML = "\n      <span class=\"button-text\">Send</span>\n    ";
        container.appendChild(inputWrapper);
        container.appendChild(this.submitButton);
        // Keyboard hint
        var keyboardHint = document.createElement('div');
        keyboardHint.className = 'keyboard-hint';
        keyboardHint.textContent = 'Press Enter to send, Shift+Enter for new line';
        var wrapper = document.createElement('div');
        wrapper.appendChild(container);
        wrapper.appendChild(keyboardHint);
        this._shadowRoot.appendChild(wrapper);
    };
    RAGInputForm.prototype.setupEventListeners = function () {
        var _this = this;
        // Auto-resize textarea
        this.textarea.addEventListener('input', function () {
            _this.autoResize();
            _this.updateCharCounter();
        });
        // Handle keyboard shortcuts
        this.textarea.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                _this.handleSubmit();
            }
            // Handle Escape to clear
            if (e.key === 'Escape') {
                _this.textarea.value = '';
                _this.autoResize();
                _this.updateCharCounter();
            }
        });
        // Submit button
        this.submitButton.addEventListener('click', function () {
            _this.handleSubmit();
        });
        // Focus management
        this.textarea.addEventListener('focus', function () {
            _this.showCharCounter();
        });
        this.textarea.addEventListener('blur', (0, dom_helpers_1.debounce)(function () {
            if (!_this.textarea.value.trim()) {
                _this.hideCharCounter();
            }
        }, 1000));
    };
    RAGInputForm.prototype.autoResize = function () {
        // Reset height to auto to get the correct scrollHeight
        this.textarea.style.height = 'auto';
        // Calculate the new height
        var maxHeight = 8 * 1.5 * 16; // 8rem in pixels (approximate)
        var newHeight = Math.min(this.textarea.scrollHeight, maxHeight);
        this.textarea.style.height = "".concat(newHeight, "px");
    };
    RAGInputForm.prototype.updateCharCounter = function () {
        var charCounter = this._shadowRoot.querySelector('.char-counter');
        var length = this.textarea.value.length;
        var maxLength = 2000; // Reasonable limit for chat messages
        charCounter.textContent = "".concat(length, "/").concat(maxLength);
        // Update styling based on length
        charCounter.classList.remove('char-counter--warning', 'char-counter--error');
        if (length > maxLength * 0.9) {
            charCounter.classList.add('char-counter--error');
        }
        else if (length > maxLength * 0.8) {
            charCounter.classList.add('char-counter--warning');
        }
        // Disable submit if over limit
        this.submitButton.disabled = length > maxLength || length === 0 || !this.isEnabled || this.isSubmitting;
    };
    RAGInputForm.prototype.showCharCounter = function () {
        var charCounter = this._shadowRoot.querySelector('.char-counter');
        charCounter.classList.add('char-counter--visible');
    };
    RAGInputForm.prototype.hideCharCounter = function () {
        var charCounter = this._shadowRoot.querySelector('.char-counter');
        charCounter.classList.remove('char-counter--visible');
    };
    RAGInputForm.prototype.handleSubmit = function () {
        var _this = this;
        var message = this.textarea.value.trim();
        if (!message || !this.isEnabled || this.isSubmitting) {
            return;
        }
        // Set loading state
        this.setSubmitting(true);
        // Emit the message event
        var event = new CustomEvent('rag-message-send', {
            detail: { message: message },
            bubbles: true
        });
        this.dispatchEvent(event);
        // Clear the input
        this.textarea.value = '';
        this.autoResize();
        this.updateCharCounter();
        this.hideCharCounter();
        // Reset loading state after a delay
        setTimeout(function () {
            _this.setSubmitting(false);
        }, 500);
    };
    RAGInputForm.prototype.setSubmitting = function (submitting) {
        this.isSubmitting = submitting;
        if (submitting) {
            this.submitButton.classList.add('submit-button--loading');
            this.submitButton.innerHTML = "\n        <div class=\"spinner\"></div>\n        <span class=\"button-text\">Sending...</span>\n      ";
        }
        else {
            this.submitButton.classList.remove('submit-button--loading');
            this.submitButton.innerHTML = "\n        <span class=\"button-text\">Send</span>\n      ";
        }
        this.updateButtonState();
    };
    RAGInputForm.prototype.updateButtonState = function () {
        var hasText = this.textarea.value.trim().length > 0;
        var isOverLimit = this.textarea.value.length > 2000;
        this.submitButton.disabled = !hasText || !this.isEnabled || this.isSubmitting || isOverLimit;
    };
    // Public API
    RAGInputForm.prototype.focus = function () {
        this.textarea.focus();
    };
    RAGInputForm.prototype.setValue = function (value) {
        this.textarea.value = value;
        this.autoResize();
        this.updateCharCounter();
    };
    RAGInputForm.prototype.getValue = function () {
        return this.textarea.value;
    };
    RAGInputForm.prototype.setEnabled = function (enabled) {
        this.isEnabled = enabled;
        this.textarea.disabled = !enabled;
        this.updateButtonState();
        if (enabled) {
            this.textarea.placeholder = 'Ask me anything about your documents...';
        }
        else {
            this.textarea.placeholder = 'Connecting to server...';
        }
    };
    RAGInputForm.prototype.clear = function () {
        this.textarea.value = '';
        this.autoResize();
        this.updateCharCounter();
        this.hideCharCounter();
    };
    return RAGInputForm;
}(HTMLElement));
exports.RAGInputForm = RAGInputForm;
// Register the custom element
customElements.define('rag-input-form', RAGInputForm);
