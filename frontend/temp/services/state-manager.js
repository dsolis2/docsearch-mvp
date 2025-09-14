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
exports.StateManager = void 0;
/**
 * Global state manager for the RAG chat application
 */
var StateManager = /** @class */ (function () {
    function StateManager() {
        this.currentSession = null;
        this.listeners = new Map();
        // Connection state
        this.connectionState = 'disconnected';
        this.initializeSession();
    }
    StateManager.getInstance = function () {
        if (!StateManager.instance) {
            StateManager.instance = new StateManager();
        }
        return StateManager.instance;
    };
    StateManager.prototype.initializeSession = function () {
        this.currentSession = {
            id: this.generateSessionId(),
            messages: [],
            created_at: new Date(),
            updated_at: new Date()
        };
    };
    StateManager.prototype.generateSessionId = function () {
        return 'session_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    };
    // Session management
    StateManager.prototype.getCurrentSession = function () {
        return this.currentSession;
    };
    StateManager.prototype.createNewSession = function () {
        this.currentSession = {
            id: this.generateSessionId(),
            messages: [],
            created_at: new Date(),
            updated_at: new Date()
        };
        this.emit('sessionCreated', this.currentSession);
        return this.currentSession;
    };
    // Message management
    StateManager.prototype.addMessage = function (message) {
        if (!this.currentSession) {
            this.initializeSession();
        }
        var fullMessage = __assign(__assign({}, message), { id: this.generateMessageId(), timestamp: new Date() });
        this.currentSession.messages.push(fullMessage);
        this.currentSession.updated_at = new Date();
        this.emit('messageAdded', fullMessage);
        return fullMessage;
    };
    StateManager.prototype.updateMessage = function (messageId, updates) {
        if (!this.currentSession)
            return null;
        var messageIndex = this.currentSession.messages.findIndex(function (m) { return m.id === messageId; });
        if (messageIndex === -1)
            return null;
        var updatedMessage = __assign(__assign({}, this.currentSession.messages[messageIndex]), updates);
        this.currentSession.messages[messageIndex] = updatedMessage;
        this.emit('messageUpdated', updatedMessage);
        return updatedMessage;
    };
    StateManager.prototype.getMessages = function () {
        var _a;
        return ((_a = this.currentSession) === null || _a === void 0 ? void 0 : _a.messages) || [];
    };
    StateManager.prototype.getLastMessage = function () {
        var messages = this.getMessages();
        return messages.length > 0 ? messages[messages.length - 1] : null;
    };
    StateManager.prototype.generateMessageId = function () {
        return 'msg_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    };
    // Citation management
    StateManager.prototype.addCitationsToMessage = function (messageId, citations) {
        var message = this.updateMessage(messageId, { citations: citations });
        if (message) {
            this.emit('citationsAdded', { messageId: messageId, citations: citations });
        }
    };
    StateManager.prototype.getAllCitations = function () {
        var messages = this.getMessages();
        return messages
            .filter(function (message) { return message.citations; })
            .flatMap(function (message) { return message.citations; })
            .filter(function (citation, index, arr) {
            return arr.findIndex(function (c) { return c.id === citation.id; }) === index;
        }); // Remove duplicates
    };
    // Event system
    StateManager.prototype.on = function (event, listener) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(listener);
    };
    StateManager.prototype.off = function (event, listener) {
        var eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.delete(listener);
            if (eventListeners.size === 0) {
                this.listeners.delete(event);
            }
        }
    };
    StateManager.prototype.emit = function (event, data) {
        var eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.forEach(function (listener) {
                try {
                    listener(data);
                }
                catch (error) {
                    console.error("Error in event listener for ".concat(event, ":"), error);
                }
            });
        }
    };
    StateManager.prototype.setConnectionState = function (state) {
        if (this.connectionState !== state) {
            this.connectionState = state;
            this.emit('connectionStateChanged', state);
        }
    };
    StateManager.prototype.getConnectionState = function () {
        return this.connectionState;
    };
    // Utility methods
    StateManager.prototype.clearSession = function () {
        if (this.currentSession) {
            this.currentSession.messages = [];
            this.emit('sessionCleared', this.currentSession);
        }
    };
    StateManager.prototype.exportSession = function () {
        return JSON.stringify(this.currentSession, null, 2);
    };
    StateManager.prototype.importSession = function (sessionData) {
        try {
            var session = JSON.parse(sessionData);
            // Basic validation
            if (session && session.id && Array.isArray(session.messages)) {
                this.currentSession = __assign(__assign({}, session), { created_at: new Date(session.created_at), updated_at: new Date(session.updated_at) });
                this.emit('sessionImported', this.currentSession);
                return true;
            }
        }
        catch (error) {
            console.error('Failed to import session:', error);
        }
        return false;
    };
    return StateManager;
}());
exports.StateManager = StateManager;
