import { Citation, CitationGroup } from '../types/citation.types';
import { StateManager } from './state-manager';

/**
 * Handles citation processing and management
 */
export class CitationHandler {
  private stateManager: StateManager;
  
  constructor() {
    this.stateManager = StateManager.getInstance();
  }

  /**
   * Groups citations by source file
   */
  public groupCitationsBySource(citations: Citation[]): CitationGroup[] {
    const groups = new Map<string, CitationGroup>();
    
    citations.forEach(citation => {
      const key = citation.source_file_id;
      
      if (!groups.has(key)) {
        groups.set(key, {
          source_file_id: citation.source_file_id,
          source_file_url: citation.source_file_url,
          source_file_name: citation.source_file_name,
          citations: [],
          total_chunks: 0
        });
      }
      
      const group = groups.get(key)!;
      group.citations.push(citation);
      group.total_chunks++;
    });
    
    // Sort citations within each group by relevance score
    groups.forEach(group => {
      group.citations.sort((a, b) => 
        (b.relevance_score || 0) - (a.relevance_score || 0)
      );
    });
    
    // Convert to array and sort groups by highest relevance score
    return Array.from(groups.values()).sort((a, b) => {
      const maxRelevanceA = Math.max(...a.citations.map(c => c.relevance_score || 0));
      const maxRelevanceB = Math.max(...b.citations.map(c => c.relevance_score || 0));
      return maxRelevanceB - maxRelevanceA;
    });
  }

  /**
   * Filters citations based on relevance threshold
   */
  public filterCitationsByRelevance(
    citations: Citation[], 
    threshold: number = 0.5
  ): Citation[] {
    return citations.filter(citation => 
      (citation.relevance_score || 0) >= threshold
    );
  }

  /**
   * Deduplicates citations based on content similarity
   */
  public deduplicateCitations(
    citations: Citation[], 
    similarityThreshold: number = 0.8
  ): Citation[] {
    const deduplicated: Citation[] = [];
    
    for (const citation of citations) {
      const isDuplicate = deduplicated.some(existing => 
        this.calculateContentSimilarity(citation.content_snippet, existing.content_snippet) > similarityThreshold
      );
      
      if (!isDuplicate) {
        deduplicated.push(citation);
      }
    }
    
    return deduplicated;
  }

  /**
   * Calculates content similarity between two citation texts
   */
  private calculateContentSimilarity(text1: string, text2: string): number {
    // Simple Jaccard similarity based on words
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Opens a citation's source document
   */
  public openCitationSource(citation: Citation): void {
    try {
      // Open in new tab/window
      window.open(citation.source_file_url, '_blank', 'noopener,noreferrer');
      
      // Track the action
      this.trackCitationClick(citation);
    } catch (error) {
      console.error('Failed to open citation source:', error);
    }
  }

  /**
   * Generates a shareable link for a citation
   */
  public generateCitationLink(citation: Citation): string {
    // Create a deep link that includes the citation ID and source info
    const params = new URLSearchParams({
      citationId: citation.id,
      source_file_id: citation.source_file_id,
      chunkIndex: citation?.metadata?.chunk_index?.toString() || '0'
    });
    
    return `${citation.source_file_url}?${params.toString()}`;
  }

  /**
   * Exports citations in various formats
   */
  public exportCitations(
    citations: Citation[], 
    format: 'json' | 'csv' | 'bibtex' = 'json'
  ): string {
    switch (format) {
      case 'json':
        return JSON.stringify(citations, null, 2);
      
      case 'csv':
        return this.exportToCsv(citations);
      
      case 'bibtex':
        return this.exportToBibtex(citations);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private exportToCsv(citations: Citation[]): string {
    const headers = [
      'ID', 'Content', 'Source File', 'File Name', 'File Type', 
      'Relevance Score', 'Last Modified'
    ];
    
    const rows = citations.map(citation => [
      citation.id,
      `"${citation.content_snippet.replace(/"/g, '""')}"`, // Escape quotes
      citation.source_file_url,
      citation.source_file_name,
      citation?.metadata?.file_type,
      citation.relevance_score?.toString() || '',
      citation?.metadata?.modified_date || ''
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private exportToBibtex(citations: Citation[]): string {
    return citations.map(citation => {
      const cleanTitle = citation?.metadata?.title || citation.source_file_name;
      const cleanAuthor = citation?.metadata?.author || 'Unknown';
      const year = citation?.metadata?.modified_date 
        ? new Date(citation?.metadata?.modified_date).getFullYear() 
        : new Date().getFullYear();
      
      return `@misc{${citation.id},
  title={${cleanTitle}},
  author={${cleanAuthor}},
  year={${year}},
  url={${citation.source_file_url}},
  note={RAG Citation - Relevance: ${citation.relevance_score || 'N/A'}}
}`;
    }).join('\n\n');
  }

  /**
   * Searches citations by content
   */
  public searchCitations(citations: Citation[], query: string): Citation[] {
    const lowercaseQuery = query.toLowerCase();
    
    return citations.filter(citation => {
      const contentMatch = citation.content_snippet.toLowerCase().includes(lowercaseQuery);
      const fileNameMatch = citation.source_file_name.toLowerCase().includes(lowercaseQuery);
      const authorMatch = citation?.metadata?.author?.toLowerCase().includes(lowercaseQuery);
      
      return contentMatch || fileNameMatch || authorMatch;
    }).sort((a, b) => {
      // Prioritize citations where the query appears in the content
      const aContentMatch = a.content_snippet.toLowerCase().includes(lowercaseQuery);
      const bContentMatch = b.content_snippet.toLowerCase().includes(lowercaseQuery);
      
      if (aContentMatch && !bContentMatch) return -1;
      if (!aContentMatch && bContentMatch) return 1;
      
      // Then sort by relevance score
      return (b.relevance_score || 0) - (a.relevance_score || 0);
    });
  }

  /**
   * Gets citations for the current conversation
   */
  public getCurrentConversationCitations(): Citation[] {
    return this.stateManager.getAllCitations();
  }

  /**
   * Tracks citation interaction for analytics
   */
  private trackCitationClick(citation: Citation): void {
    // This could be extended to send analytics data
    console.log('Citation clicked:', {
      citationId: citation.id,
      source_file_id: citation.source_file_id,
      fileName: citation.source_file_name,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Validates citation data integrity
   */
  public validateCitation(citation: any): citation is Citation {
    return (
      typeof citation === 'object' &&
      typeof citation.id === 'string' &&
      typeof citation.content_snippet === 'string' &&
      typeof citation.source_file_id === 'string' &&
      typeof citation.source_file_url === 'string' &&
      typeof citation.source_file_name === 'string'
    );
  }

  /**
   * Processes raw citations from the backend
   */
  public processCitations(rawCitations: any[]): Citation[] {
    return rawCitations
      .filter(this.validateCitation.bind(this))
      .map(citation => ({
        ...citation,
        relevance_score: citation.relevance_score || 0
      }))
      .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
  }
}