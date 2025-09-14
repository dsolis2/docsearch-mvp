import { Citation, CitationGroup } from '../types/citation.types';
/**
 * Handles citation processing and management
 */
export declare class CitationHandler {
    private stateManager;
    constructor();
    /**
     * Groups citations by source file
     */
    groupCitationsBySource(citations: Citation[]): CitationGroup[];
    /**
     * Filters citations based on relevance threshold
     */
    filterCitationsByRelevance(citations: Citation[], threshold?: number): Citation[];
    /**
     * Deduplicates citations based on content similarity
     */
    deduplicateCitations(citations: Citation[], similarityThreshold?: number): Citation[];
    /**
     * Calculates content similarity between two citation texts
     */
    private calculateContentSimilarity;
    /**
     * Opens a citation's source document
     */
    openCitationSource(citation: Citation): void;
    /**
     * Generates a shareable link for a citation
     */
    generateCitationLink(citation: Citation): string;
    /**
     * Exports citations in various formats
     */
    exportCitations(citations: Citation[], format?: 'json' | 'csv' | 'bibtex'): string;
    private exportToCsv;
    private exportToBibtex;
    /**
     * Searches citations by content
     */
    searchCitations(citations: Citation[], query: string): Citation[];
    /**
     * Gets citations for the current conversation
     */
    getCurrentConversationCitations(): Citation[];
    /**
     * Tracks citation interaction for analytics
     */
    private trackCitationClick;
    /**
     * Validates citation data integrity
     */
    validateCitation(citation: any): citation is Citation;
    /**
     * Processes raw citations from the backend
     */
    processCitations(rawCitations: any[]): Citation[];
}
//# sourceMappingURL=citation-handler.d.ts.map