import { WebSocketMessage, WebSocketConfig } from '../types/api.types';
import { StateManager } from './state-manager';

/**
 * WebSocket client for real-time communication with the RAG backend
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private stateManager!: StateManager; // Definite assignment assertion
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts: number = 0;
  private isIntentionallyClosed: boolean = false;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor(config: WebSocketConfig) {
    this.config = {
      url: config.url,
      reconnectAttempts: config.reconnectAttempts || 0,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      reconnectInterval: config.reconnectInterval || 3000,
      reconnectDelay: config.reconnectDelay || 1000,
      pingInterval: config.pingInterval || 30000,
      heartbeatInterval: config.heartbeatInterval || 25000
    };
    this.stateManager = StateManager.getInstance();
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.isIntentionallyClosed = false;
        this.stateManager.setConnectionState('connecting');
        
        this.ws = new WebSocket(this.config.url);
        
        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.stateManager.setConnectionState('connected');
          this.reconnectAttempts = 0;
          this.startPing();
          this.emit('connected', null);
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.stateManager.setConnectionState('disconnected');
          this.cleanup();
          this.emit('disconnected', { code: event.code, reason: event.reason });
          
          if (!this.isIntentionallyClosed) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.emit('error', error);
          reject(error);
        };

      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        this.stateManager.setConnectionState('disconnected');
        reject(error);
      }
    });
  }

  public disconnect(): void {
    this.isIntentionallyClosed = true;
    this.cleanup();
    
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close(1000, 'Client disconnect');
      }
      this.ws = null;
    }
    
    this.stateManager.setConnectionState('disconnected');
  }

  public sendMessage(type: string, data: any): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected. Cannot send message.');
      return false;
    }

    try {
      const message: WebSocketMessage = {
        type: type as any, // Cast to match enum type
        data
      };
      
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      return false;
    }
  }

  public sendChatMessage(message: string, sessionId?: string): boolean {
    return this.sendMessage('chat_message', {
      message,
      sessionId: sessionId || this.stateManager.getCurrentSession()?.id,
      timestamp: Date.now()
    });
  }

  private handleMessage(rawData: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(rawData);
      
      switch (message.type) {
        case 'connection_status':
          // Handle ping/pong for connection health
          break;
          
        case 'session_start':
          // Handle session initialization
          console.log('Session started:', message.data);
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
      
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private handleMessageStart(data: any): void {
    const message = this.stateManager.addMessage({
      content: '',
      role: 'assistant',
      status: 'streaming',
      isStreaming: true
    });
    
    this.emit('messageStart', { messageId: message.id, ...data });
  }

  private handleMessageChunk(data: any): void {
    const lastMessage = this.stateManager.getLastMessage();
    if (lastMessage && lastMessage.role === 'assistant' && lastMessage.isStreaming) {
      const updatedContent = (lastMessage.content || '') + (data.content || '');
      this.stateManager.updateMessage(lastMessage.id, { 
        content: updatedContent,
        isStreaming: true
      });
      this.emit('messageChunk', { messageId: lastMessage.id, chunk: data.content });
    }
  }

  private handleMessageComplete(data: any): void {
    const lastMessage = this.stateManager.getLastMessage();
    if (lastMessage && lastMessage.role === 'assistant') {
      this.stateManager.updateMessage(lastMessage.id, { 
        isStreaming: false,
        ...(data.content && { content: data.content })
      });
      this.emit('messageComplete', { messageId: lastMessage.id, ...data });
    }
  }

  private handleCitations(data: any): void {
    const { messageId, citations } = data;
    if (messageId && citations) {
      this.stateManager.addCitationsToMessage(messageId, citations);
      this.emit('citations', data);
    }
  }

  private handleError(data: any): void {
    console.error('WebSocket error from server:', data);
    this.emit('serverError', data);
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached. Giving up.');
      this.emit('maxReconnectAttemptsReached', null);
      return;
    }

    this.reconnectAttempts++;
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} in ${this.config.reconnectInterval}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      if (!this.isIntentionallyClosed) {
        console.log(`Reconnect attempt ${this.reconnectAttempts}`);
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }
    }, this.config.reconnectInterval);
  }

  private startPing(): void {
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendMessage('ping', null);
      }
    }, this.config.pingInterval);
  }

  private cleanup(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  // Event system
  public on(event: string, listener: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  public off(event: string, listener: (data: any) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  private emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${event}:`, error);
        }
      });
    }
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  public getConnectionState(): number | undefined {
    return this.ws?.readyState;
  }
}