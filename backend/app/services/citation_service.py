"""
Citation Service for RAG Chat API.

This service handles citation extraction, formatting, and management
for retrieved documents and AI responses.
"""

import logging
import re
from typing import List, Dict, Any, Optional, Set, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)

class CitationService:
    """Service for processing and managing citations from retrieved documents."""
    
    def __init__(self):
        self.initialized = True
        logger.info("Citation service initialized")
    
    def process_retrieved_documents(
        self,
        documents: List[Dict[str, Any]],
        query: str = None
    ) -> List[Dict[str, Any]]:
        """
        Process retrieved documents into standardized citation format.
        
        Args:
            documents: Raw documents from vector search
            query: Original query for relevance highlighting
            
        Returns:
            List of processed citations
        """
        citations = []
        
        for i, doc in enumerate(documents):
            try:
                # Extract relevant snippet (limit to reasonable length)
                content = doc.get("content", "")
                snippet = self._extract_snippet(content, query, max_length=300)
                
                # Create standardized citation
                citation = {
                    "id": f"citation_{i + 1}",
                    "index": i + 1,
                    "source_file_id": doc.get("source_file_id", ""),
                    "source_file_url": doc.get("source_file_url", ""),
                    "source_file_name": doc.get("source_file_name", f"Document {i + 1}"),
                    "content_snippet": snippet,
                    "full_content": content,
                    "relevance_score": doc.get("relevance_score", 0.0),
                    "chunk_index": doc.get("chunk_index", 0),
                    "section_title": doc.get("section_title", ""),
                    "file_type": doc.get("file_type", ""),
                    "created_at": doc.get("created_at", ""),
                    "page_number": self._extract_page_number(doc),
                    "highlighted_terms": self._find_highlighted_terms(content, query) if query else [],
                    "metadata": {
                        "file_type": doc.get("file_type", "unknown"),
                        "chunk_index": doc.get("chunk_index", 0),
                        "section_title": doc.get("section_title", ""),
                    }
                }
                
                citations.append(citation)
                
            except Exception as e:
                logger.error(f"Error processing document {i}: {e}")
                continue
        
        logger.info(f"Processed {len(citations)} citations from {len(documents)} documents")
        return citations
    
    def _extract_snippet(self, content: str, query: str = None, max_length: int = 300) -> str:
        """
        Extract relevant snippet from content, prioritizing query terms.
        
        Args:
            content: Full document content
            query: Search query to prioritize
            max_length: Maximum snippet length
            
        Returns:
            Extracted snippet
        """
        if not content:
            return ""
        
        # If content is already short enough, return as is
        if len(content) <= max_length:
            return content.strip()
        
        # If no query, return beginning of content
        if not query:
            return content[:max_length].strip() + "..."
        
        # Find the best snippet containing query terms
        query_terms = self._extract_query_terms(query)
        
        if not query_terms:
            return content[:max_length].strip() + "..."
        
        # Find positions of query terms in content (case-insensitive)
        content_lower = content.lower()
        term_positions = []
        
        for term in query_terms:
            term_lower = term.lower()
            start = 0
            while True:
                pos = content_lower.find(term_lower, start)
                if pos == -1:
                    break
                term_positions.append(pos)
                start = pos + 1
        
        if not term_positions:
            return content[:max_length].strip() + "..."
        
        # Find the best center position (median of term positions)
        term_positions.sort()
        center_pos = term_positions[len(term_positions) // 2]
        
        # Calculate snippet boundaries
        start_pos = max(0, center_pos - max_length // 2)
        end_pos = min(len(content), start_pos + max_length)
        
        # Adjust start if we're at the end
        if end_pos == len(content):
            start_pos = max(0, end_pos - max_length)
        
        # Try to break at word boundaries
        snippet = content[start_pos:end_pos]
        
        # Clean up boundaries
        if start_pos > 0:
            # Find first space to avoid cutting words
            space_pos = snippet.find(' ')
            if space_pos > 0 and space_pos < 50:  # Don't cut too much
                snippet = snippet[space_pos + 1:]
                start_pos += space_pos + 1
        
        if end_pos < len(content):
            # Find last space to avoid cutting words
            space_pos = snippet.rfind(' ')
            if space_pos > len(snippet) - 50:  # Don't cut too much
                snippet = snippet[:space_pos]
        
        # Add ellipsis if needed
        prefix = "..." if start_pos > 0 else ""
        suffix = "..." if end_pos < len(content) else ""
        
        return f"{prefix}{snippet.strip()}{suffix}"
    
    def _extract_query_terms(self, query: str) -> List[str]:
        """Extract meaningful terms from query string."""
        if not query:
            return []
        
        # Remove common stop words and short terms
        stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
            'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
            'what', 'when', 'where', 'who', 'why', 'how'
        }
        
        # Extract words (3+ characters)
        words = re.findall(r'\b\w{3,}\b', query.lower())
        
        # Filter out stop words
        meaningful_terms = [word for word in words if word not in stop_words]
        
        return meaningful_terms[:5]  # Limit to top 5 terms
    
    def _find_highlighted_terms(self, content: str, query: str) -> List[str]:
        """Find query terms that appear in the content for highlighting."""
        if not query or not content:
            return []
        
        query_terms = self._extract_query_terms(query)
        content_lower = content.lower()
        
        found_terms = []
        for term in query_terms:
            if term.lower() in content_lower:
                found_terms.append(term)
        
        return found_terms
    
    def _extract_page_number(self, doc: Dict[str, Any]) -> Optional[int]:
        """
        Extract page number from document metadata.
        
        Args:
            doc: Document with metadata
            
        Returns:
            Page number if available
        """
        # Try different metadata locations for page number
        chunk_index = doc.get("chunk_index", 0)
        
        # Estimate page number based on chunk index
        # Assuming ~2-3 chunks per page on average
        if chunk_index > 0:
            estimated_page = max(1, chunk_index // 2 + 1)
            return estimated_page
        
        # Check if explicitly provided in metadata
        metadata = doc.get("metadata", {})
        if isinstance(metadata, dict):
            page = metadata.get("page", metadata.get("page_number"))
            if page:
                try:
                    return int(page)
                except (ValueError, TypeError):
                    pass
        
        return None
    
    def format_citations_for_response(
        self,
        citations: List[Dict[str, Any]],
        format_type: str = "numbered"
    ) -> str:
        """
        Format citations for inclusion in AI response.
        
        Args:
            citations: List of citation objects
            format_type: How to format citations ('numbered', 'inline', 'footnote')
            
        Returns:
            Formatted citation text
        """
        if not citations:
            return ""
        
        if format_type == "numbered":
            return self._format_numbered_citations(citations)
        elif format_type == "inline":
            return self._format_inline_citations(citations)
        elif format_type == "footnote":
            return self._format_footnote_citations(citations)
        else:
            return self._format_numbered_citations(citations)
    
    def _format_numbered_citations(self, citations: List[Dict[str, Any]]) -> str:
        """Format citations with numbers [1], [2], etc."""
        if not citations:
            return ""
        
        formatted = []
        for citation in citations:
            num = citation.get("index", len(formatted) + 1)
            name = citation.get("source_file_name", "Unknown Document")
            page = citation.get("page_number")
            
            if page:
                formatted.append(f"[{num}] {name} (p. {page})")
            else:
                formatted.append(f"[{num}] {name}")
        
        return " ".join(formatted)
    
    def _format_inline_citations(self, citations: List[Dict[str, Any]]) -> str:
        """Format citations inline with document names."""
        if not citations:
            return ""
        
        names = []
        for citation in citations:
            name = citation.get("source_file_name", "Unknown Document")
            page = citation.get("page_number")
            
            if page:
                names.append(f"{name} (p. {page})")
            else:
                names.append(name)
        
        if len(names) == 1:
            return f"(Source: {names[0]})"
        elif len(names) == 2:
            return f"(Sources: {names[0]} and {names[1]})"
        else:
            return f"(Sources: {', '.join(names[:-1])}, and {names[-1]})"
    
    def _format_footnote_citations(self, citations: List[Dict[str, Any]]) -> str:
        """Format citations as footnote references."""
        if not citations:
            return ""
        
        indices = [str(citation.get("index", i + 1)) for i, citation in enumerate(citations)]
        return "^" + ",".join(indices)
    
    def deduplicate_citations(
        self,
        citations: List[Dict[str, Any]],
        by_field: str = "source_file_id"
    ) -> List[Dict[str, Any]]:
        """
        Remove duplicate citations based on specified field.
        
        Args:
            citations: List of citations
            by_field: Field to use for deduplication
            
        Returns:
            Deduplicated list of citations
        """
        if not citations:
            return []
        
        seen = set()
        unique_citations = []
        
        for citation in citations:
            key = citation.get(by_field)
            if key and key not in seen:
                seen.add(key)
                unique_citations.append(citation)
            elif not key:
                # Keep citations without the key field
                unique_citations.append(citation)
        
        return unique_citations
    
    def filter_citations_by_relevance(
        self,
        citations: List[Dict[str, Any]],
        min_score: float = 0.5,
        max_citations: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Filter citations by relevance score and limit count.
        
        Args:
            citations: List of citations
            min_score: Minimum relevance score
            max_citations: Maximum number of citations to return
            
        Returns:
            Filtered list of citations
        """
        if not citations:
            return []
        
        # Filter by minimum score
        filtered = [
            citation for citation in citations
            if citation.get("relevance_score", 0.0) >= min_score
        ]
        
        # Sort by relevance score (descending)
        filtered.sort(key=lambda x: x.get("relevance_score", 0.0), reverse=True)
        
        # Limit count
        return filtered[:max_citations]
    
    def get_citations_summary(self, citations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Get summary statistics about citations.
        
        Args:
            citations: List of citations
            
        Returns:
            Summary dictionary
        """
        if not citations:
            return {
                "total_citations": 0,
                "unique_sources": 0,
                "avg_relevance_score": 0.0,
                "file_types": {},
                "sources": []
            }
        
        # Count unique sources
        unique_sources = set()
        file_types = {}
        scores = []
        sources = []
        
        for citation in citations:
            source_id = citation.get("source_file_id")
            if source_id:
                unique_sources.add(source_id)
            
            # Count file types
            file_type = citation.get("file_type", "unknown")
            file_types[file_type] = file_types.get(file_type, 0) + 1
            
            # Collect scores
            score = citation.get("relevance_score", 0.0)
            if score > 0:
                scores.append(score)
            
            # Collect source info
            source_info = {
                "name": citation.get("source_file_name", "Unknown"),
                "type": file_type,
                "score": score
            }
            sources.append(source_info)
        
        avg_score = sum(scores) / len(scores) if scores else 0.0
        
        return {
            "total_citations": len(citations),
            "unique_sources": len(unique_sources),
            "avg_relevance_score": round(avg_score, 3),
            "file_types": file_types,
            "sources": sources
        }

# Global service instance
citation_service = CitationService()