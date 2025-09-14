import { APIError, SessionInfo } from '../types/api.types';

/**
 * REST API client for non-WebSocket operations
 */
export class APIClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
  }

  /**
   * Makes an HTTP request with error handling
   */
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: `HTTP ${response.status}: ${response.statusText}`,
          code: 'HTTP_ERROR'
        }));
        
        const apiError = new Error(errorData.message || 'Request failed') as APIError;
        apiError.code = errorData.code || 'UNKNOWN_ERROR';
        apiError.details = errorData;
        throw apiError;
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text() as unknown as T;
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }
      
      // Network or other errors
      const apiError = new Error(error instanceof Error ? error.message : 'Network error') as APIError;
      apiError.code = 'NETWORK_ERROR';
      apiError.details = error as Record<string, any>;
      throw apiError;
    }
  }

  /**
   * GET request
   */
  public async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  public async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * PUT request
   */
  public async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * DELETE request
   */
  public async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Specific API methods

  /**
   * Get health check
   */
  public async getHealth(): Promise<{ status: string; timestamp: string }> {
    return this.get('/api/health');
  }

  /**
   * Get session information
   */
  public async getSession(sessionId: string): Promise<SessionInfo> {
    return this.get(`/api/sessions/${sessionId}`);
  }

  /**
   * Create a new session
   */
  public async createSession(): Promise<SessionInfo> {
    return this.post('/api/sessions');
  }

  /**
   * Delete a session
   */
  public async deleteSession(sessionId: string): Promise<void> {
    return this.delete(`/api/sessions/${sessionId}`);
  }

  /**
   * Get available models
   */
  public async getAvailableModels(): Promise<{ models: string[] }> {
    return this.get('/api/models');
  }

  /**
   * Get system configuration
   */
  public async getConfig(): Promise<{
    websocket_url: string;
    max_tokens: number;
    supported_file_types: string[];
    features: string[];
  }> {
    return this.get('/api/config');
  }

  /**
   * Upload a document (if supported)
   */
  public async uploadDocument(file: File): Promise<{
    fileId: string;
    fileName: string;
    processingStatus: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request('/api/documents/upload', {
      method: 'POST',
      body: formData,
      headers: {} // Let browser set Content-Type for multipart
    });
  }

  /**
   * Get document status
   */
  public async getDocumentStatus(fileId: string): Promise<{
    fileId: string;
    status: 'processing' | 'completed' | 'failed';
    chunksCreated?: number;
    error?: string;
  }> {
    return this.get(`/api/documents/${fileId}/status`);
  }

  /**
   * Search documents
   */
  public async searchDocuments(query: string, limit: number = 10): Promise<{
    results: Array<{
      fileId: string;
      fileName: string;
      relevanceScore: number;
      chunks: Array<{
        content: string;
        chunkIndex: number;
        relevanceScore: number;
      }>;
    }>;
    totalResults: number;
  }> {
    return this.post('/api/documents/search', { query, limit });
  }

  /**
   * Set API key or authentication token
   */
  public setAuthHeader(token: string): void {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Remove authentication header
   */
  public clearAuthHeader(): void {
    delete this.defaultHeaders['Authorization'];
  }

  /**
   * Set custom header
   */
  public setHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }

  /**
   * Get current base URL
   */
  public getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Set new base URL
   */
  public setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }
}

// APIError is imported from ../types/api.types
