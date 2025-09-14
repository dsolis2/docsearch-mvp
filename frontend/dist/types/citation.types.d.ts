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
        chunk_index?: number;
        section_title?: string;
        [key: string]: any;
    };
}
export interface CitationMetadata {
    file_name: string;
    file_type: string;
    page_number?: number;
    chunk_index?: number;
    section_title?: string;
    created_date?: string;
    modified_date?: string;
    [key: string]: any;
}
export interface CitationGroup {
    source_file_id: string;
    source_file_url: string;
    source_file_name: string;
    citations: Citation[];
    total_chunks: number;
}
export interface CitationDisplayProps {
    citation: Citation;
    isExpanded?: boolean;
    showMetadata?: boolean;
}
//# sourceMappingURL=citation.types.d.ts.map