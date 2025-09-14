import { SessionInfo } from '../types/api.types';
/**
 * REST API client for non-WebSocket operations
 */
export declare class APIClient {
    private baseUrl;
    private defaultHeaders;
    constructor(baseUrl?: string);
    /**
     * Makes an HTTP request with error handling
     */
    private request;
    /**
     * GET request
     */
    get<T>(endpoint: string): Promise<T>;
    /**
     * POST request
     */
    post<T>(endpoint: string, data?: any): Promise<T>;
    /**
     * PUT request
     */
    put<T>(endpoint: string, data?: any): Promise<T>;
    /**
     * DELETE request
     */
    delete<T>(endpoint: string): Promise<T>;
    /**
     * Get health check
     */
    getHealth(): Promise<{
        status: string;
        timestamp: string;
    }>;
    /**
     * Get session information
     */
    getSession(sessionId: string): Promise<SessionInfo>;
    /**
     * Create a new session
     */
    createSession(): Promise<SessionInfo>;
    /**
     * Delete a session
     */
    deleteSession(sessionId: string): Promise<void>;
    /**
     * Get available models
     */
    getAvailableModels(): Promise<{
        models: string[];
    }>;
    /**
     * Get system configuration
     */
    getConfig(): Promise<{
        websocket_url: string;
        max_tokens: number;
        supported_file_types: string[];
        features: string[];
    }>;
    /**
     * Upload a document (if supported)
     */
    uploadDocument(file: File): Promise<{
        fileId: string;
        fileName: string;
        processingStatus: string;
    }>;
    /**
     * Get document status
     */
    getDocumentStatus(fileId: string): Promise<{
        fileId: string;
        status: 'processing' | 'completed' | 'failed';
        chunksCreated?: number;
        error?: string;
    }>;
    /**
     * Search documents
     */
    searchDocuments(query: string, limit?: number): Promise<{
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
    }>;
    /**
     * Set API key or authentication token
     */
    setAuthHeader(token: string): void;
    /**
     * Remove authentication header
     */
    clearAuthHeader(): void;
    /**
     * Set custom header
     */
    setHeader(key: string, value: string): void;
    /**
     * Get current base URL
     */
    getBaseUrl(): string;
    /**
     * Set new base URL
     */
    setBaseUrl(baseUrl: string): void;
}
//# sourceMappingURL=api-client.d.ts.map