export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status: 'sending' | 'sent' | 'streaming' | 'completed' | 'error';
  isStreaming?: boolean;
  citations?: Citation[];
  metadata?: Record<string, any>;
}

export interface Citation {
  id: string;
  source_file_id: string;
  source_file_url: string;
  source_file_name: string;
  content_snippet: string;
  relevance_score?: number;
  page_number?: number;
  metadata?: {
    file_type?: string;
    created_date?: string;
    modified_date?: string;
    [key: string]: any;
  };
}

export interface ChatSession {
  id: string;
  messages: Message[];
  created_at: Date;
  updated_at: Date;
  title?: string;
}

export interface MessageDelta {
  id: string;
  content: string;
  is_complete: boolean;
  citations?: Citation[];
}