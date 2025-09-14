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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAGMessageList = void 0;
var dom_helpers_1 = require("../utils/dom-helpers");
var RAGMessageList = /** @class */ (function (_super) {
    __extends(RAGMessageList, _super);
    function RAGMessageList() {
        var _this = _super.call(this) || this;
        _this.messages = [];
        _this._shadowRoot = _this.attachShadow({ mode: 'open' });
        _this.setupComponent();
        return _this;
    }
    RAGMessageList.prototype.connectedCallback = function () {
        this.render();
    };
    RAGMessageList.prototype.setupComponent = function () {
        var style = document.createElement('style');
        style.textContent = "\n      :host {\n        display: block;\n        flex: 1;\n        overflow-y: auto;\n        background: var(--rag-surface-color, #f8fafc);\n      }\n      \n      .message-container {\n        padding: var(--rag-spacing-md, 1rem);\n        min-height: 100%;\n        display: flex;\n        flex-direction: column;\n      }\n      \n      .message {\n        margin-bottom: var(--rag-spacing-md, 1rem);\n        display: flex;\n        flex-direction: column;\n        opacity: 0;\n        transform: translateY(10px);\n        animation: messageSlideIn 0.3s ease-out forwards;\n      }\n      \n      @keyframes messageSlideIn {\n        to {\n          opacity: 1;\n          transform: translateY(0);\n        }\n      }\n      \n      .message--user {\n        align-items: flex-end;\n      }\n      \n      .message--assistant {\n        align-items: flex-start;\n      }\n      \n      .message__content {\n        max-width: 80%;\n        padding: var(--rag-spacing-sm, 0.5rem) var(--rag-spacing-md, 1rem);\n        border-radius: var(--rag-border-radius, 0.5rem);\n        word-wrap: break-word;\n        white-space: pre-wrap;\n        line-height: 1.5;\n        position: relative;\n      }\n      \n      .message--user .message__content {\n        background: var(--rag-primary-color, #2563eb);\n        color: white;\n        border-bottom-right-radius: var(--rag-border-radius-sm, 0.25rem);\n      }\n      \n      .message--assistant .message__content {\n        background: var(--rag-background-color, #ffffff);\n        border: 1px solid var(--rag-border-color, #e2e8f0);\n        color: var(--rag-text-primary, #1e293b);\n        border-bottom-left-radius: var(--rag-border-radius-sm, 0.25rem);\n      }\n      \n      .message__meta {\n        font-size: var(--rag-font-size-sm, 0.875rem);\n        color: var(--rag-text-muted, #94a3b8);\n        margin-top: var(--rag-spacing-xs, 0.25rem);\n        padding: 0 var(--rag-spacing-sm, 0.5rem);\n        display: flex;\n        align-items: center;\n        gap: var(--rag-spacing-sm, 0.5rem);\n      }\n      \n      .message__timestamp {\n        opacity: 0.7;\n      }\n      \n      .message__status {\n        font-style: italic;\n      }\n      \n      .message--streaming .message__content::after {\n        content: \"\u258B\";\n        animation: cursorBlink 1s infinite;\n        color: var(--rag-primary-color, #2563eb);\n      }\n      \n      .message--user.message--streaming .message__content::after {\n        color: rgba(255, 255, 255, 0.8);\n      }\n      \n      @keyframes cursorBlink {\n        0%, 50% { opacity: 1; }\n        51%, 100% { opacity: 0; }\n      }\n      \n      .message--error .message__content {\n        background: #fef2f2;\n        border-color: #fecaca;\n        color: var(--rag-error-color, #dc2626);\n      }\n      \n      .empty-state {\n        display: flex;\n        flex-direction: column;\n        align-items: center;\n        justify-content: center;\n        padding: var(--rag-spacing-xl, 2rem);\n        text-align: center;\n        color: var(--rag-text-secondary, #64748b);\n        flex: 1;\n      }\n      \n      .empty-state__icon {\n        font-size: 3rem;\n        margin-bottom: var(--rag-spacing-md, 1rem);\n        opacity: 0.5;\n      }\n      \n      .empty-state__title {\n        font-size: var(--rag-font-size-lg, 1.125rem);\n        font-weight: 600;\n        margin-bottom: var(--rag-spacing-sm, 0.5rem);\n        color: var(--rag-text-primary, #1e293b);\n      }\n      \n      .empty-state__message {\n        max-width: 300px;\n        line-height: 1.5;\n      }\n      \n      .citation-indicators {\n        margin-top: var(--rag-spacing-xs, 0.25rem);\n        display: flex;\n        gap: var(--rag-spacing-xs, 0.25rem);\n        flex-wrap: wrap;\n      }\n      \n      .citation-indicator {\n        display: inline-flex;\n        align-items: center;\n        gap: 0.25rem;\n        padding: 0.125rem 0.375rem;\n        background: var(--rag-primary-color, #2563eb);\n        color: white;\n        border-radius: 0.75rem;\n        font-size: 0.75rem;\n        cursor: pointer;\n        transition: background-color 0.2s ease;\n      }\n      \n      .citation-indicator:hover {\n        background: #1d4ed8;\n      }\n      \n      .citation-count {\n        font-weight: 600;\n      }\n    ";
        this._shadowRoot.appendChild(style);
    };
    RAGMessageList.prototype.render = function () {
        this.messageContainer = document.createElement('div');
        this.messageContainer.className = 'message-container';
        this.renderMessages();
        this._shadowRoot.appendChild(this.messageContainer);
    };
    RAGMessageList.prototype.renderMessages = function () {
        var _this = this;
        if (this.messages.length === 0) {
            this.renderEmptyState();
            return;
        }
        this.messageContainer.innerHTML = '';
        this.messages.forEach(function (message) {
            var messageElement = _this.createMessageElement(message);
            _this.messageContainer.appendChild(messageElement);
        });
        // Scroll to bottom
        this.scrollToBottom();
    };
    RAGMessageList.prototype.renderEmptyState = function () {
        this.messageContainer.innerHTML = "\n      <div class=\"empty-state\">\n        <div class=\"empty-state__icon\">\uD83D\uDCAC</div>\n        <div class=\"empty-state__title\">Start a Conversation</div>\n        <div class=\"empty-state__message\">\n          Ask me anything about your documents. I'll search through your knowledge base and provide relevant answers with citations.\n        </div>\n      </div>\n    ";
    };
    RAGMessageList.prototype.createMessageElement = function (message) {
        var messageEl = document.createElement('div');
        messageEl.className = "message message--".concat(message.role);
        messageEl.setAttribute('data-message-id', message.id);
        if (message.status) {
            messageEl.classList.add("message--".concat(message.status));
        }
        var contentEl = document.createElement('div');
        contentEl.className = 'message__content';
        contentEl.innerHTML = this.formatMessageContent(message.content);
        var metaEl = document.createElement('div');
        metaEl.className = 'message__meta';
        var timestampEl = document.createElement('span');
        timestampEl.className = 'message__timestamp';
        timestampEl.textContent = (0, dom_helpers_1.formatTimestamp)(message.timestamp);
        metaEl.appendChild(timestampEl);
        // Add status if not completed
        if (message.status && message.status !== 'completed' && message.status !== 'sent') {
            var statusEl = document.createElement('span');
            statusEl.className = 'message__status';
            statusEl.textContent = this.getStatusText(message.status);
            metaEl.appendChild(statusEl);
        }
        messageEl.appendChild(contentEl);
        messageEl.appendChild(metaEl);
        // Add citations if available
        if (message.citations && message.citations.length > 0) {
            var citationIndicators = this.createCitationIndicators(message.citations);
            messageEl.appendChild(citationIndicators);
        }
        return messageEl;
    };
    RAGMessageList.prototype.formatMessageContent = function (content) {
        // Basic HTML escaping and line break handling
        var formatted = (0, dom_helpers_1.escapeHtml)(content);
        // Convert newlines to HTML breaks (but preserve pre-wrap behavior)
        // This is mainly for display purposes
        return formatted;
    };
    RAGMessageList.prototype.getStatusText = function (status) {
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
    };
    RAGMessageList.prototype.createCitationIndicators = function (citations) {
        var _this = this;
        var container = document.createElement('div');
        container.className = 'citation-indicators';
        var indicator = document.createElement('button');
        indicator.className = 'citation-indicator';
        indicator.innerHTML = "\n      <span class=\"citation-count\">".concat(citations.length, "</span>\n      <span>source").concat(citations.length > 1 ? 's' : '', "</span>\n    ");
        indicator.addEventListener('click', function () {
            // Emit event to show citations
            var event = new CustomEvent('rag-citations-received', {
                detail: { citations: citations },
                bubbles: true
            });
            _this.dispatchEvent(event);
        });
        container.appendChild(indicator);
        return container;
    };
    RAGMessageList.prototype.scrollToBottom = function () {
        var _this = this;
        // Use requestAnimationFrame to ensure the DOM is updated
        requestAnimationFrame(function () {
            _this.scrollTop = _this.scrollHeight;
        });
    };
    // Public API methods
    RAGMessageList.prototype.addMessage = function (message) {
        this.messages.push(message);
        this.renderMessages();
    };
    RAGMessageList.prototype.updateMessage = function (updatedMessage) {
        var index = this.messages.findIndex(function (m) { return m.id === updatedMessage.id; });
        if (index !== -1) {
            this.messages[index] = updatedMessage;
            // Update just this message element instead of re-rendering all
            var messageElement = this._shadowRoot.querySelector("[data-message-id=\"".concat(updatedMessage.id, "\"]"));
            if (messageElement) {
                var newElement = this.createMessageElement(updatedMessage);
                messageElement.replaceWith(newElement);
            }
        }
    };
    RAGMessageList.prototype.clearMessages = function () {
        this.messages = [];
        this.renderMessages();
    };
    RAGMessageList.prototype.getMessages = function () {
        return __spreadArray([], this.messages, true);
    };
    RAGMessageList.prototype.streamMessageUpdate = function (messageId, contentDelta) {
        var message = this.messages.find(function (m) { return m.id === messageId; });
        if (message) {
            message.content += contentDelta;
            // Update the content element directly for smooth streaming
            var messageElement = this._shadowRoot.querySelector("[data-message-id=\"".concat(messageId, "\"] .message__content"));
            if (messageElement) {
                messageElement.innerHTML = this.formatMessageContent(message.content);
            }
            // Ensure we stay scrolled to bottom during streaming
            this.scrollToBottom();
        }
    };
    return RAGMessageList;
}(HTMLElement));
exports.RAGMessageList = RAGMessageList;
// Register the custom element
customElements.define('rag-message-list', RAGMessageList);
