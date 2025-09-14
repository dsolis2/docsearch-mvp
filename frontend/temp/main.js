"use strict";
/**
 * RAG Chat Frontend - Main Entry Point
 *
 * This module initializes the RAG Chat system and exports the main API
 * for integration with WordPress and other platforms.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAGChat = void 0;
exports.createRAGChat = createRAGChat;
require("./styles/components.css");
var index_1 = require("./components/index");
// Import all components to register them
require("./components/index");
/**
 * Main RAG Chat class for programmatic access
 */
var RAGChat = /** @class */ (function () {
    function RAGChat(container, config) {
        if (config === void 0) { config = {}; }
        // Get container element
        if (typeof container === 'string') {
            var element = document.querySelector(container);
            if (!element) {
                throw new Error("RAGChat: Container element \"".concat(container, "\" not found"));
            }
            this.container = element;
        }
        else {
            this.container = container;
        }
        // Apply configuration
        (0, index_1.configureRAGChat)(config);
        // Initialize chat interface
        this.init();
    }
    RAGChat.prototype.init = function () {
        // Create chat interface element
        this.chatInterface = document.createElement('rag-chat-interface');
        // Apply container styling
        this.container.style.height = this.container.style.height || '600px';
        this.container.style.width = this.container.style.width || '100%';
        // Add chat interface to container
        this.container.appendChild(this.chatInterface);
        // Set up event listeners for external integration
        this.setupEventListeners();
    };
    RAGChat.prototype.setupEventListeners = function () {
        var _this = this;
        // Listen for messages to enable external handling
        this.chatInterface.addEventListener('rag-message-send', (function (event) {
            _this.onMessageSend(event.detail);
        }));
        // Listen for citation clicks
        this.chatInterface.addEventListener('rag-citation-clicked', (function (event) {
            _this.onCitationClick(event.detail);
        }));
        // Listen for connection status changes
        this.chatInterface.addEventListener('rag-connection-status', (function (event) {
            _this.onConnectionStatusChange(event.detail);
        }));
    };
    RAGChat.prototype.onMessageSend = function (detail) {
        // Emit external event for WordPress integration
        var event = new CustomEvent('ragchat:message-send', {
            detail: detail,
            bubbles: true
        });
        document.dispatchEvent(event);
    };
    RAGChat.prototype.onCitationClick = function (detail) {
        // Emit external event for WordPress integration
        var event = new CustomEvent('ragchat:citation-click', {
            detail: detail,
            bubbles: true
        });
        document.dispatchEvent(event);
    };
    RAGChat.prototype.onConnectionStatusChange = function (detail) {
        // Emit external event for WordPress integration
        var event = new CustomEvent('ragchat:connection-status', {
            detail: detail,
            bubbles: true
        });
        document.dispatchEvent(event);
    };
    // Public API methods
    RAGChat.prototype.clearMessages = function () {
        if (this.chatInterface) {
            this.chatInterface.clearMessages();
        }
    };
    RAGChat.prototype.getMessages = function () {
        if (this.chatInterface) {
            return this.chatInterface.getMessages();
        }
        return [];
    };
    RAGChat.prototype.getSessionId = function () {
        if (this.chatInterface) {
            return this.chatInterface.getSessionId();
        }
        return null;
    };
    RAGChat.prototype.destroy = function () {
        if (this.chatInterface) {
            this.chatInterface.remove();
        }
    };
    return RAGChat;
}());
exports.RAGChat = RAGChat;
/**
 * Initialize RAG Chat with simple API
 */
function createRAGChat(container, config) {
    if (config === void 0) { config = {}; }
    return new RAGChat(container, config);
}
/**
 * Global initialization for WordPress and other platforms
 */
function initGlobal() {
    // Make available globally for WordPress
    window.RAGChat = {
        create: createRAGChat,
        configure: index_1.configureRAGChat,
        getConfig: index_1.getRAGChatConfig
    };
    // Auto-initialize if elements with data-rag-chat attribute exist
    document.addEventListener('DOMContentLoaded', function () {
        var elements = document.querySelectorAll('[data-rag-chat]');
        elements.forEach(function (element) {
            try {
                var config = element.getAttribute('data-rag-chat-config');
                var parsedConfig = config ? JSON.parse(config) : {};
                new RAGChat(element, parsedConfig);
            }
            catch (error) {
                console.error('RAGChat: Failed to auto-initialize element:', error);
            }
        });
    });
    // Emit ready event
    document.addEventListener('DOMContentLoaded', function () {
        var event = new CustomEvent('ragchat:ready', {
            detail: { version: '1.0.0' }
        });
        document.dispatchEvent(event);
    });
}
// Initialize global features
initGlobal();
// Export main API
exports.default = RAGChat;
__exportStar(require("./components/index"), exports);
/**
 * Usage Examples:
 *
 * 1. Basic Usage:
 *    import RAGChat from './path/to/rag-chat';
 *    const chat = new RAGChat('#chat-container');
 *
 * 2. With Configuration:
 *    const chat = new RAGChat('#chat-container', {
 *      apiEndpoint: '/api/chat',
 *      theme: 'dark',
 *      enableCitations: true
 *    });
 *
 * 3. WordPress Integration:
 *    <div data-rag-chat data-rag-chat-config='{"theme":"dark"}'></div>
 *
 * 4. Global Access (after script load):
 *    const chat = window.RAGChat.create('#chat-container');
 */ 
