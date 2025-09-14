import { Message, ChatSession } from '../types/message.types';
import { Citation } from '../types/citation.types';
/**
 * Global state manager for the RAG chat application
 */
export declare class StateManager {
    private static instance;
    private currentSession;
    private listeners;
    private constructor();
    static getInstance(): StateManager;
    private initializeSession;
    private generateSessionId;
    getCurrentSession(): ChatSession | null;
    createNewSession(): ChatSession;
    addMessage(message: Omit<Message, 'id' | 'timestamp'>): Message;
    updateMessage(messageId: string, updates: Partial<Message>): Message | null;
    getMessages(): Message[];
    getLastMessage(): Message | null;
    private generateMessageId;
    addCitationsToMessage(messageId: string, citations: Citation[]): void;
    getAllCitations(): Citation[];
    on(event: string, listener: (data: any) => void): void;
    off(event: string, listener: (data: any) => void): void;
    private emit;
    private connectionState;
    setConnectionState(state: 'connecting' | 'connected' | 'disconnected'): void;
    getConnectionState(): 'connecting' | 'connected' | 'disconnected';
    clearSession(): void;
    exportSession(): string;
    importSession(sessionData: string): boolean;
}
//# sourceMappingURL=state-manager.d.ts.map