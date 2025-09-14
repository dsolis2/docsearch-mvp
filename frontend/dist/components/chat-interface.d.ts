import '../styles/components.css';
import type { Message } from '../types/message.types';
export declare class RAGChatInterface extends HTMLElement {
    private _shadowRoot;
    private sessionId;
    private messages;
    private _isConnected;
    private wsClient;
    private messageList?;
    private inputForm?;
    private citationPanel?;
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    private setupComponent;
    private render;
    private setupEventListeners;
    private handleMessageSend;
    private handleCitationsReceived;
    private handleConnectionStatus;
    private addMessage;
    private updateConnectionStatus;
    private sendToBackend;
    private setupWebSocketListeners;
    private connectWebSocket;
    private cleanup;
    getSessionId(): string;
    getMessages(): Message[];
    clearMessages(): void;
}
//# sourceMappingURL=chat-interface.d.ts.map