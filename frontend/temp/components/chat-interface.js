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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
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
exports.RAGChatInterface = void 0;
require("../styles/components.css");
var dom_helpers_1 = require("../utils/dom-helpers");
var websocket_client_1 = require("../services/websocket-client");
var RAGChatInterface = /** @class */ (function (_super) {
    __extends(RAGChatInterface, _super);
    function RAGChatInterface() {
        var _this = _super.call(this) || this;
        _this.messages = [];
        _this._isConnected = false;
        _this._shadowRoot = _this.attachShadow({ mode: 'open' });
        _this.sessionId = (0, dom_helpers_1.generateId)('session');
        // Initialize WebSocket client
        _this.wsClient = new websocket_client_1.WebSocketClient({
            url: "ws://127.0.0.1:8000/ws/".concat(_this.sessionId)
        });
        _this.setupComponent();
        _this.setupWebSocketListeners();
        return _this;
    }
    RAGChatInterface.prototype.connectedCallback = function () {
        var _this = this;
        this.render();
        this.setupEventListeners();
        // Connect to WebSocket
        this.connectWebSocket();
        // Auto-focus input when connected
        setTimeout(function () {
            var input = _this._shadowRoot.querySelector('rag-input-form');
            if (input) {
                input.focus();
            }
        }, 100);
    };
    RAGChatInterface.prototype.disconnectedCallback = function () {
        this.cleanup();
        // Disconnect WebSocket
        if (this.wsClient) {
            this.wsClient.disconnect();
        }
    };
    RAGChatInterface.prototype.setupComponent = function () {
        // Add CSS
        var style = document.createElement('style');
        style.textContent = "\n      :host {\n        display: block;\n        width: 100%;\n        height: 100%;\n        font-family: var(--rag-font-family, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif);\n      }\n      \n      .chat-container {\n        display: flex;\n        flex-direction: column;\n        height: 100%;\n        background: var(--rag-background-color, #ffffff);\n        border: 1px solid var(--rag-border-color, #e2e8f0);\n        border-radius: var(--rag-border-radius, 0.5rem);\n        overflow: hidden;\n        box-shadow: var(--rag-shadow-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1));\n      }\n      \n      .chat-header {\n        padding: 1rem;\n        border-bottom: 1px solid var(--rag-border-color, #e2e8f0);\n        background: var(--rag-surface-color, #f8fafc);\n      }\n      \n      .chat-title {\n        margin: 0;\n        font-size: 1.125rem;\n        font-weight: 600;\n        color: var(--rag-text-primary, #1e293b);\n      }\n      \n      .chat-status {\n        font-size: 0.875rem;\n        color: var(--rag-text-secondary, #64748b);\n        margin-top: 0.25rem;\n      }\n      \n      .connection-indicator {\n        display: inline-block;\n        width: 8px;\n        height: 8px;\n        border-radius: 50%;\n        margin-right: 0.5rem;\n      }\n      \n      .connection-indicator--connected {\n        background-color: var(--rag-success-color, #059669);\n      }\n      \n      .connection-indicator--disconnected {\n        background-color: var(--rag-error-color, #dc2626);\n      }\n      \n      .connection-indicator--connecting {\n        background-color: var(--rag-warning-color, #d97706);\n        animation: pulse 1.5s ease-in-out infinite;\n      }\n      \n      @keyframes pulse {\n        0%, 100% { opacity: 1; }\n        50% { opacity: 0.5; }\n      }\n    ";
        this._shadowRoot.appendChild(style);
    };
    RAGChatInterface.prototype.render = function () {
        var container = document.createElement('div');
        container.className = 'chat-container';
        // Header
        var header = document.createElement('div');
        header.className = 'chat-header';
        header.innerHTML = "\n      <h2 class=\"chat-title\">RAG Chat Assistant</h2>\n      <div class=\"chat-status\">\n        <span class=\"connection-indicator connection-indicator--disconnected\"></span>\n        <span class=\"status-text\">Disconnected</span>\n      </div>\n    ";
        // Message List
        var messageList = document.createElement('rag-message-list');
        messageList.setAttribute('session-id', this.sessionId);
        this.messageList = messageList;
        // Citation Panel (initially hidden)
        var citationPanel = document.createElement('rag-citation-panel');
        citationPanel.style.display = 'none';
        this.citationPanel = citationPanel;
        // Input Form
        var inputForm = document.createElement('rag-input-form');
        inputForm.setAttribute('session-id', this.sessionId);
        this.inputForm = inputForm;
        container.appendChild(header);
        container.appendChild(messageList);
        container.appendChild(citationPanel);
        container.appendChild(inputForm);
        this._shadowRoot.appendChild(container);
    };
    RAGChatInterface.prototype.setupEventListeners = function () {
        // Listen for message events from input form
        this.addEventListener('rag-message-send', this.handleMessageSend.bind(this));
        // Listen for citation events from message list
        this.addEventListener('rag-citations-received', this.handleCitationsReceived.bind(this));
        // Listen for WebSocket connection events
        this.addEventListener('rag-connection-status', this.handleConnectionStatus.bind(this));
    };
    RAGChatInterface.prototype.handleMessageSend = function (event) {
        var message = event.detail.message;
        // Add user message immediately
        var userMessage = {
            id: (0, dom_helpers_1.generateId)('msg'),
            role: 'user',
            content: message,
            timestamp: new Date(),
            status: 'sent'
        };
        this.addMessage(userMessage);
        // Create placeholder for assistant response
        var assistantMessage = {
            id: (0, dom_helpers_1.generateId)('msg'),
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            status: 'streaming'
        };
        this.addMessage(assistantMessage);
        // Send to backend (will be implemented in Phase 2)
        this.sendToBackend(message, assistantMessage.id);
    };
    RAGChatInterface.prototype.handleCitationsReceived = function (event) {
        var citations = event.detail.citations;
        if (citations && citations.length > 0) {
            // Show citation panel
            if (this.citationPanel) {
                this.citationPanel.style.display = 'block';
                this.citationPanel.setCitations(citations);
            }
        }
    };
    RAGChatInterface.prototype.handleConnectionStatus = function (event) {
        var status = event.detail.status;
        this.updateConnectionStatus(status);
    };
    RAGChatInterface.prototype.addMessage = function (message) {
        this.messages.push(message);
        if (this.messageList) {
            this.messageList.addMessage(message);
        }
    };
    RAGChatInterface.prototype.updateConnectionStatus = function (status) {
        this._isConnected = status === 'connected';
        var indicator = this._shadowRoot.querySelector('.connection-indicator');
        var statusText = this._shadowRoot.querySelector('.status-text');
        if (indicator && statusText) {
            indicator.className = "connection-indicator connection-indicator--".concat(status);
            statusText.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        }
        // Enable/disable input based on connection
        if (this.inputForm) {
            this.inputForm.setEnabled(this._isConnected);
        }
    };
    RAGChatInterface.prototype.sendToBackend = function (message, messageId) {
        var _this = this;
        // Send message via WebSocket
        if (this.wsClient && this.wsClient.isConnected()) {
            this.wsClient.sendChatMessage(message, this.sessionId);
        }
        else {
            console.error('WebSocket not connected, cannot send message');
            // Fallback to simulation if WebSocket is not available
            setTimeout(function () {
                _this.simulateResponse(messageId);
            }, 1000);
        }
    };
    RAGChatInterface.prototype.simulateResponse = function (messageId) {
        // Find the message and update it
        var message = this.messages.find(function (m) { return m.id === messageId; });
        if (message) {
            message.content = 'This is a simulated response. The actual implementation will use WebSocket streaming with LlamaIndex and Weaviate.';
            message.status = 'completed';
            if (this.messageList) {
                this.messageList.updateMessage(message);
            }
        }
    };
    RAGChatInterface.prototype.setupWebSocketListeners = function () {
        var _this = this;
        // Listen for WebSocket events
        this.wsClient.on('connected', function () {
            _this.updateConnectionStatus('connected');
        });
        this.wsClient.on('disconnected', function () {
            _this.updateConnectionStatus('disconnected');
        });
        this.wsClient.on('messageChunk', function (data) {
            // Handle streaming message updates
            if (_this.messageList) {
                _this.messageList.updateStreamingMessage(data.messageId, data.chunk);
            }
        });
        this.wsClient.on('messageComplete', function (data) {
            // Handle message completion
            if (_this.messageList) {
                _this.messageList.completeMessage(data.messageId);
            }
        });
        this.wsClient.on('citations', function (data) {
            // Handle citations
            _this.handleCitationsReceived(new CustomEvent('rag-citations-received', {
                detail: { citations: data.citations }
            }));
        });
        this.wsClient.on('serverError', function (data) {
            console.error('Server error:', data);
            // Show error message to user
            _this.addMessage({
                id: (0, dom_helpers_1.generateId)('msg'),
                role: 'assistant',
                content: "Error: ".concat(data.error || 'Something went wrong'),
                timestamp: new Date(),
                status: 'error'
            });
        });
    };
    RAGChatInterface.prototype.connectWebSocket = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        this.updateConnectionStatus('connecting');
                        return [4 /*yield*/, this.wsClient.connect()];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        console.error('Failed to connect to WebSocket:', error_1);
                        this.updateConnectionStatus('disconnected');
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    RAGChatInterface.prototype.cleanup = function () {
        // Clean up WebSocket connection
        if (this.wsClient) {
            this.wsClient.disconnect();
        }
    };
    // Public API
    RAGChatInterface.prototype.getSessionId = function () {
        return this.sessionId;
    };
    RAGChatInterface.prototype.getMessages = function () {
        return __spreadArray([], this.messages, true);
    };
    RAGChatInterface.prototype.clearMessages = function () {
        this.messages = [];
        if (this.messageList) {
            this.messageList.clearMessages();
        }
        if (this.citationPanel) {
            this.citationPanel.style.display = 'none';
        }
    };
    return RAGChatInterface;
}(HTMLElement));
exports.RAGChatInterface = RAGChatInterface;
// Register the custom element
customElements.define('rag-chat-interface', RAGChatInterface);
