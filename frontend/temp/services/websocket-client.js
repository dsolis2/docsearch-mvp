"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketClient = void 0;
var state_manager_1 = require("./state-manager");
/**
 * WebSocket client for real-time communication with the RAG backend
 */
var WebSocketClient = /** @class */ (function () {
    function WebSocketClient(config) {
        this.ws = null;
        this.reconnectTimer = null;
        this.pingTimer = null;
        this.reconnectAttempts = 0;
        this.isIntentionallyClosed = false;
        this.listeners = new Map();
        this.config = {
            url: config.url,
            reconnectAttempts: config.reconnectAttempts || 0,
            maxReconnectAttempts: config.maxReconnectAttempts || 5,
            reconnectInterval: config.reconnectInterval || 3000,
            reconnectDelay: config.reconnectDelay || 1000,
            pingInterval: config.pingInterval || 30000,
            heartbeatInterval: config.heartbeatInterval || 25000
        };
        this.stateManager = state_manager_1.StateManager.getInstance();
    }
    WebSocketClient.prototype.connect = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                _this.isIntentionallyClosed = false;
                _this.stateManager.setConnectionState('connecting');
                _this.ws = new WebSocket(_this.config.url);
                _this.ws.onopen = function () {
                    console.log('WebSocket connected');
                    _this.stateManager.setConnectionState('connected');
                    _this.reconnectAttempts = 0;
                    _this.startPing();
                    _this.emit('connected', null);
                    resolve();
                };
                _this.ws.onmessage = function (event) {
                    _this.handleMessage(event.data);
                };
                _this.ws.onclose = function (event) {
                    console.log('WebSocket closed:', event.code, event.reason);
                    _this.stateManager.setConnectionState('disconnected');
                    _this.cleanup();
                    _this.emit('disconnected', { code: event.code, reason: event.reason });
                    if (!_this.isIntentionallyClosed) {
                        _this.scheduleReconnect();
                    }
                };
                _this.ws.onerror = function (error) {
                    console.error('WebSocket error:', error);
                    _this.emit('error', error);
                    reject(error);
                };
            }
            catch (error) {
                console.error('Failed to create WebSocket connection:', error);
                _this.stateManager.setConnectionState('disconnected');
                reject(error);
            }
        });
    };
    WebSocketClient.prototype.disconnect = function () {
        this.isIntentionallyClosed = true;
        this.cleanup();
        if (this.ws) {
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.close(1000, 'Client disconnect');
            }
            this.ws = null;
        }
        this.stateManager.setConnectionState('disconnected');
    };
    WebSocketClient.prototype.sendMessage = function (type, data) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket not connected. Cannot send message.');
            return false;
        }
        try {
            var message = {
                type: type, // Cast to match enum type
                data: data
            };
            this.ws.send(JSON.stringify(message));
            return true;
        }
        catch (error) {
            console.error('Failed to send WebSocket message:', error);
            return false;
        }
    };
    WebSocketClient.prototype.sendChatMessage = function (message, sessionId) {
        var _a;
        return this.sendMessage('chat', {
            message: message,
            sessionId: sessionId || ((_a = this.stateManager.getCurrentSession()) === null || _a === void 0 ? void 0 : _a.id),
            timestamp: Date.now()
        });
    };
    WebSocketClient.prototype.handleMessage = function (rawData) {
        try {
            var message = JSON.parse(rawData);
            switch (message.type) {
                case 'connection_status':
                    // Handle ping/pong for connection health
                    break;
                case 'typing_start':
                    this.handleMessageStart(message.data);
                    break;
                case 'message_delta':
                    this.handleMessageChunk(message.data);
                    break;
                case 'message_complete':
                    this.handleMessageComplete(message.data);
                    break;
                case 'citations':
                    this.handleCitations(message.data);
                    break;
                case 'error':
                    this.handleError(message.data);
                    break;
                default:
                    console.warn('Unknown message type:', message.type);
            }
            this.emit('message', message);
        }
        catch (error) {
            console.error('Failed to parse WebSocket message:', error);
        }
    };
    WebSocketClient.prototype.handleMessageStart = function (data) {
        var message = this.stateManager.addMessage({
            content: '',
            role: 'assistant',
            status: 'streaming',
            isStreaming: true
        });
        this.emit('messageStart', __assign({ messageId: message.id }, data));
    };
    WebSocketClient.prototype.handleMessageChunk = function (data) {
        var lastMessage = this.stateManager.getLastMessage();
        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
            var updatedContent = (lastMessage.content || '') + (data.content || '');
            this.stateManager.updateMessage(lastMessage.id, {
                content: updatedContent,
                isStreaming: true
            });
            this.emit('messageChunk', { messageId: lastMessage.id, chunk: data.content });
        }
    };
    WebSocketClient.prototype.handleMessageComplete = function (data) {
        var lastMessage = this.stateManager.getLastMessage();
        if (lastMessage && lastMessage.role === 'assistant') {
            this.stateManager.updateMessage(lastMessage.id, __assign({ isStreaming: false }, (data.content && { content: data.content })));
            this.emit('messageComplete', __assign({ messageId: lastMessage.id }, data));
        }
    };
    WebSocketClient.prototype.handleCitations = function (data) {
        var messageId = data.messageId, citations = data.citations;
        if (messageId && citations) {
            this.stateManager.addCitationsToMessage(messageId, citations);
            this.emit('citations', data);
        }
    };
    WebSocketClient.prototype.handleError = function (data) {
        console.error('WebSocket error from server:', data);
        this.emit('serverError', data);
    };
    WebSocketClient.prototype.scheduleReconnect = function () {
        var _this = this;
        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached. Giving up.');
            this.emit('maxReconnectAttemptsReached', null);
            return;
        }
        this.reconnectAttempts++;
        console.log("Scheduling reconnect attempt ".concat(this.reconnectAttempts, "/").concat(this.config.maxReconnectAttempts, " in ").concat(this.config.reconnectInterval, "ms"));
        this.reconnectTimer = setTimeout(function () {
            if (!_this.isIntentionallyClosed) {
                console.log("Reconnect attempt ".concat(_this.reconnectAttempts));
                _this.connect().catch(function (error) {
                    console.error('Reconnection failed:', error);
                });
            }
        }, this.config.reconnectInterval);
    };
    WebSocketClient.prototype.startPing = function () {
        var _this = this;
        this.pingTimer = setInterval(function () {
            var _a;
            if (((_a = _this.ws) === null || _a === void 0 ? void 0 : _a.readyState) === WebSocket.OPEN) {
                _this.sendMessage('ping', null);
            }
        }, this.config.pingInterval);
    };
    WebSocketClient.prototype.cleanup = function () {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    };
    // Event system
    WebSocketClient.prototype.on = function (event, listener) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(listener);
    };
    WebSocketClient.prototype.off = function (event, listener) {
        var eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.delete(listener);
            if (eventListeners.size === 0) {
                this.listeners.delete(event);
            }
        }
    };
    WebSocketClient.prototype.emit = function (event, data) {
        var eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.forEach(function (listener) {
                try {
                    listener(data);
                }
                catch (error) {
                    console.error("Error in WebSocket event listener for ".concat(event, ":"), error);
                }
            });
        }
    };
    WebSocketClient.prototype.isConnected = function () {
        var _a;
        return ((_a = this.ws) === null || _a === void 0 ? void 0 : _a.readyState) === WebSocket.OPEN;
    };
    WebSocketClient.prototype.getConnectionState = function () {
        var _a;
        return (_a = this.ws) === null || _a === void 0 ? void 0 : _a.readyState;
    };
    return WebSocketClient;
}());
exports.WebSocketClient = WebSocketClient;
