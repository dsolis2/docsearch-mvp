export interface WebSocketMessage {
  type: 'message_delta' | 'message_complete' | 'citations' | 'error' | 'session_start' | 'session_end' | 'connection_status' | 'typing_start' | 'typing_stop';
  data: any;
  session_id?: string;
  message_id?: string;
}

export interface WebSocketConfig {
  url: string;
  reconnectAttempts?: number;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  pingInterval?: number;
}

export interface APIError extends Error {
  code?: string;
  status?: number;
  details?: Record<string, any>;
}

export interface ChatRequest {
  message: string;
  session_id?: string;
  model?: 'openai' | 'anthropic';
  max_tokens?: number;
  temperature?: number;
}

export interface ChatResponse {
  message_id: string;
  session_id: string;
  content: string;
  citations: Citation[];
  metadata: Record<string, any>;
}

export interface ErrorResponse {
  error: string;
  code: string;
  details?: Record<string, any>;
}

export interface SessionInfo {
  session_id: string;
  created_at: string;
  message_count: number;
}

import type { Citation } from './message.types';
