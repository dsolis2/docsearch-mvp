import { WebSocketConfig } from '../types/api.types';
/**
 * WebSocket client for real-time communication with the RAG backend
 */
export declare class WebSocketClient {
    private ws;
    private config;
    private stateManager;
    private reconnectTimer;
    private pingTimer;
    private reconnectAttempts;
    private isIntentionallyClosed;
    private listeners;
    constructor(config: WebSocketConfig);
    connect(): Promise<void>;
    disconnect(): void;
    sendMessage(type: string, data: any): boolean;
    sendChatMessage(message: string, sessionId?: string): boolean;
    private handleMessage;
    private handleMessageStart;
    private handleTypingStop;
    private handleMessageChunk;
    private handleMessageComplete;
    private handleCitations;
    private handleError;
    private scheduleReconnect;
    private startPing;
    private cleanup;
    on(event: string, listener: (data: any) => void): void;
    off(event: string, listener: (data: any) => void): void;
    private emit;
    isConnected(): boolean;
    getConnectionState(): number | undefined;
}
//# sourceMappingURL=websocket-client.d.ts.map