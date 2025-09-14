"use strict";
/**
 * RAG Chat Components - Web Components for the RAG Chat system
 *
 * This module exports all the Web Components used in the RAG Chat interface.
 * Each component is designed to be used independently or as part of the complete system.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAGCitationPanel = exports.RAGInputForm = exports.RAGMessageList = exports.RAGChatInterface = void 0;
exports.configureRAGChat = configureRAGChat;
exports.getRAGChatConfig = getRAGChatConfig;
// Import and register all components
require("./chat-interface");
require("./message-list");
require("./input-form");
require("./citation-panel");
// Re-export component classes for programmatic access
var chat_interface_1 = require("./chat-interface");
Object.defineProperty(exports, "RAGChatInterface", { enumerable: true, get: function () { return chat_interface_1.RAGChatInterface; } });
var message_list_1 = require("./message-list");
Object.defineProperty(exports, "RAGMessageList", { enumerable: true, get: function () { return message_list_1.RAGMessageList; } });
var input_form_1 = require("./input-form");
Object.defineProperty(exports, "RAGInputForm", { enumerable: true, get: function () { return input_form_1.RAGInputForm; } });
var citation_panel_1 = require("./citation-panel");
Object.defineProperty(exports, "RAGCitationPanel", { enumerable: true, get: function () { return citation_panel_1.RAGCitationPanel; } });
/**
 * Apply global configuration to RAG Chat components
 */
function configureRAGChat(config) {
    if (config === void 0) { config = {}; }
    // Set CSS custom properties for theming
    var root = document.documentElement;
    if (config.theme === 'dark') {
        root.style.setProperty('--rag-background-color', '#1a1a1a');
        root.style.setProperty('--rag-surface-color', '#2d2d2d');
        root.style.setProperty('--rag-text-primary', '#ffffff');
        root.style.setProperty('--rag-text-secondary', '#b3b3b3');
        root.style.setProperty('--rag-border-color', '#404040');
    }
    else if (config.theme === 'light') {
        root.style.setProperty('--rag-background-color', '#ffffff');
        root.style.setProperty('--rag-surface-color', '#f8fafc');
        root.style.setProperty('--rag-text-primary', '#1e293b');
        root.style.setProperty('--rag-text-secondary', '#64748b');
        root.style.setProperty('--rag-border-color', '#e2e8f0');
    }
    // Store config for components to access
    window.RAGChatConfig = config;
}
/**
 * Get current configuration
 */
function getRAGChatConfig() {
    return window.RAGChatConfig || {};
}
