import { Message, ChatSession } from '../types/message.types';
import { Citation } from '../types/citation.types';

/**
 * Global state manager for the RAG chat application
 */
export class StateManager {
  private static instance: StateManager;
  private currentSession: ChatSession | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  private constructor() {
    this.initializeSession();
  }

  public static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  private initializeSession(): void {
    this.currentSession = {
      id: this.generateSessionId(),
      messages: [],
      created_at: new Date(),
      updated_at: new Date()
    };
  }

  private generateSessionId(): string {
    return 'session_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Session management
  public getCurrentSession(): ChatSession | null {
    return this.currentSession;
  }

  public createNewSession(): ChatSession {
    this.currentSession = {
      id: this.generateSessionId(),
      messages: [],
      created_at: new Date(),
      updated_at: new Date()
    };
    
    this.emit('sessionCreated', this.currentSession);
    return this.currentSession;
  }

  // Message management
  public addMessage(message: Omit<Message, 'id' | 'timestamp'>): Message {
    if (!this.currentSession) {
      this.initializeSession();
    }

    const fullMessage: Message = {
      ...message,
      id: this.generateMessageId(),
      timestamp: new Date()
    };

    this.currentSession!.messages.push(fullMessage);
    this.currentSession!.updated_at = new Date();
    
    this.emit('messageAdded', fullMessage);
    return fullMessage;
  }

  public updateMessage(messageId: string, updates: Partial<Message>): Message | null {
    if (!this.currentSession) return null;

    const messageIndex = this.currentSession.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return null;

    const updatedMessage = {
      ...this.currentSession.messages[messageIndex],
      ...updates
    };

    this.currentSession.messages[messageIndex] = updatedMessage;
    this.emit('messageUpdated', updatedMessage);
    
    return updatedMessage;
  }

  public getMessages(): Message[] {
    return this.currentSession?.messages || [];
  }

  public getLastMessage(): Message | null {
    const messages = this.getMessages();
    return messages.length > 0 ? messages[messages.length - 1] : null;
  }

  private generateMessageId(): string {
    return 'msg_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Citation management
  public addCitationsToMessage(messageId: string, citations: Citation[]): void {
    const message = this.updateMessage(messageId, { citations });
    if (message) {
      this.emit('citationsAdded', { messageId, citations });
    }
  }

  public getAllCitations(): Citation[] {
    const messages = this.getMessages();
    return messages
      .filter(message => message.citations)
      .flatMap(message => message.citations!)
      .filter((citation, index, arr) => 
        arr.findIndex(c => c.id === citation.id) === index
      ); // Remove duplicates
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
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Connection state
  private connectionState: 'connecting' | 'connected' | 'disconnected' = 'disconnected';

  public setConnectionState(state: 'connecting' | 'connected' | 'disconnected'): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.emit('connectionStateChanged', state);
    }
  }

  public getConnectionState(): 'connecting' | 'connected' | 'disconnected' {
    return this.connectionState;
  }

  // Utility methods
  public clearSession(): void {
    if (this.currentSession) {
      this.currentSession.messages = [];
      this.emit('sessionCleared', this.currentSession);
    }
  }

  public exportSession(): string {
    return JSON.stringify(this.currentSession, null, 2);
  }

  public importSession(sessionData: string): boolean {
    try {
      const session = JSON.parse(sessionData) as ChatSession;
      // Basic validation
      if (session && session.id && Array.isArray(session.messages)) {
        this.currentSession = {
          ...session,
          created_at: new Date(session.created_at),
          updated_at: new Date(session.updated_at)
        };
        this.emit('sessionImported', this.currentSession);
        return true;
      }
    } catch (error) {
      console.error('Failed to import session:', error);
    }
    return false;
  }
}