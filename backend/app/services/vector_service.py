"""
Vector Service for RAG Chat API.

This service handles vector similarity search using PostgreSQL with pgvector
and integrates with LlamaIndex for RAG functionality.
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional, Tuple
from contextlib import asynccontextmanager

import psycopg
import voyageai
from llama_index.core import VectorStoreIndex, StorageContext
from llama_index.core import Settings
from llama_index.core.schema import TextNode, NodeWithScore
from pgvector.psycopg import register_vector
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config.settings import settings

logger = logging.getLogger(__name__)

class VectorService:
    """Service for vector similarity search and retrieval using PostgreSQL with pgvector."""
    
    def __init__(self):
        self.connection: Optional[psycopg.Connection] = None
        self.voyage_client: Optional[voyageai.Client] = None
        self.embedding_model: str = "voyage-2"
        self.embedding_dim: int = 1024
        self.initialized = False
        # Database URL - can be overridden by environment variables
        self.database_url = getattr(settings, 'database_url', "postgresql://localhost/docsearch_rag")
    
    async def initialize(self):
        """Initialize PostgreSQL connection and VoyageAI client."""
        try:
            # Initialize PostgreSQL connection
            self.connection = psycopg.connect(self.database_url)
            register_vector(self.connection)
            
            # Test connection by querying version
            with self.connection.cursor() as cur:
                cur.execute("SELECT version();")
                db_version = cur.fetchone()[0]
                logger.info(f"Connected to PostgreSQL: {db_version[:50]}...")
                
                # Check if pgvector is available
                cur.execute("SELECT extname FROM pg_extension WHERE extname = 'vector';")
                if not cur.fetchone():
                    raise ConnectionError("pgvector extension not found in database")
                    
                logger.info("pgvector extension confirmed")
            
            # Initialize VoyageAI client
            voyage_api_key = getattr(settings, 'voyage_api_key', None)
            if voyage_api_key:
                self.voyage_client = voyageai.Client(api_key=voyage_api_key)
                logger.info("VoyageAI client initialized")
            else:
                logger.warning("No VoyageAI API key provided for embeddings")
            
            # Verify our schema exists
            await self._verify_schema()
            
            self.initialized = True
            logger.info("Vector service initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize vector service: {e}")
            if self.connection:
                self.connection.close()
                self.connection = None
            raise
    
    async def _verify_schema(self):
        """Verify that required PostgreSQL tables exist."""
        try:
            with self.connection.cursor() as cur:
                # Check if our tables exist
                cur.execute("""
                    SELECT table_name FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name IN ('documents', 'chunks', 'embeddings');
                """)
                tables = [row[0] for row in cur.fetchall()]
                
                expected_tables = {'documents', 'chunks', 'embeddings'}
                missing_tables = expected_tables - set(tables)
                
                if missing_tables:
                    raise ConnectionError(f"Missing required tables: {missing_tables}")
                
                logger.info(f"Database schema verified: {', '.join(sorted(tables))}")
                
        except Exception as e:
            logger.error(f"Failed to verify schema: {e}")
            raise
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def _embed_text(self, text: str) -> List[float]:
        """Generate embedding for a single text using VoyageAI."""
        if not self.voyage_client:
            raise ValueError("VoyageAI client not initialized")
        
        result = self.voyage_client.embed(
            texts=[text],
            model=self.embedding_model,
            input_type="query"  # Use query type for search queries
        )
        return result.embeddings[0]
    
    async def similarity_search(
        self,
        query: str,
        limit: int = 5,
        score_threshold: float = 0.7,
        filters: Dict[str, Any] = None
    ) -> Tuple[List[Dict[str, Any]], List[float]]:
        """
        Perform similarity search using PostgreSQL with pgvector.
        
        Args:
            query: Search query text
            limit: Maximum number of results
            score_threshold: Minimum similarity score
            filters: Additional filters for search
            
        Returns:
            Tuple of (documents, scores)
        """
        if not self.initialized:
            await self.initialize()
        
        try:
            # Generate embedding for the query
            query_embedding = await self._embed_text(query)
            
            # Use our PostgreSQL function for vector search
            with self.connection.cursor() as cur:
                cur.execute(
                    "SELECT * FROM search_similar_chunks(%s, %s);",
                    (query_embedding, limit)
                )
                results = cur.fetchall()
                
                # Extract column names
                columns = [desc[0] for desc in cur.description]
                
                documents = []
                scores = []
                
                for row in results:
                    row_dict = dict(zip(columns, row))
                    similarity_score = row_dict.get('similarity', 0.0)
                    
                    # Filter by score threshold
                    if similarity_score >= score_threshold:
                        document = {
                            "content": row_dict.get('content', ''),
                            "source_file_id": row_dict.get('drive_file_id', ''),
                            "source_file_url": row_dict.get('drive_web_view_link', ''),
                            "source_file_name": row_dict.get('file_name', ''),
                            "chunk_index": row_dict.get('chunk_id', 0),
                            "section_title": row_dict.get('section_title', ''),
                            "file_type": "",  # Could add this to the function if needed
                            "created_at": "",  # Could add this if needed
                            "relevance_score": similarity_score
                        }
                        documents.append(document)
                        scores.append(similarity_score)
                
                logger.info(f"Retrieved {len(documents)} documents for query: {query[:50]}...")
                return documents, scores
            
        except Exception as e:
            logger.error(f"Error in similarity search: {e}")
            return [], []
    
    async def get_retriever(self, similarity_top_k: int = 5):
        """Get custom retriever for LlamaIndex integration."""
        if not self.initialized:
            await self.initialize()
            
        return PostgreSQLRetriever(
            vector_service=self,
            similarity_top_k=similarity_top_k
        )
    
    async def get_document_count(self) -> int:
        """Get total number of documents in the PostgreSQL database."""
        if not self.initialized:
            await self.initialize()
        
        try:
            with self.connection.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM documents WHERE status = 'done';")
                count = cur.fetchone()[0]
                return count or 0
        except Exception as e:
            logger.error(f"Error getting document count: {e}")
            return 0
    
    async def get_chunk_count(self) -> int:
        """Get total number of chunks in the database."""
        if not self.initialized:
            await self.initialize()
            
        try:
            with self.connection.cursor() as cur:
                cur.execute("""
                    SELECT COUNT(*) FROM chunks c 
                    JOIN documents d ON c.document_id = d.id 
                    WHERE d.status = 'done';
                """)
                count = cur.fetchone()[0]
                return count or 0
        except Exception as e:
            logger.error(f"Error getting chunk count: {e}")
            return 0
    
    async def health_check(self) -> Dict[str, Any]:
        """Check health status of PostgreSQL connection and VoyageAI."""
        if not self.initialized:
            return {"status": "not_initialized"}
        
        try:
            # Test database connection
            with self.connection.cursor() as cur:
                cur.execute("SELECT 1;")
                cur.fetchone()
            
            # Get basic stats
            doc_count = await self.get_document_count()
            chunk_count = await self.get_chunk_count()
            
            return {
                "status": "healthy",
                "database_url": self.database_url.split('@')[-1],  # Hide credentials
                "document_count": doc_count,
                "chunk_count": chunk_count,
                "embedding_model": self.embedding_model,
                "embedding_dim": self.embedding_dim,
                "voyage_client": "initialized" if self.voyage_client else "not_initialized"
            }
            
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def cleanup(self):
        """Clean up resources."""
        if self.connection:
            self.connection.close()
        
        self.connection = None
        self.voyage_client = None
        self.initialized = False
        logger.info("Vector service cleaned up")


class PostgreSQLRetriever:
    """Custom retriever for LlamaIndex integration with PostgreSQL."""
    
    def __init__(self, vector_service: VectorService, similarity_top_k: int = 5):
        self.vector_service = vector_service
        self.similarity_top_k = similarity_top_k
    
    async def retrieve(self, query: str) -> List[NodeWithScore]:
        """Retrieve nodes for a query."""
        documents, scores = await self.vector_service.similarity_search(
            query=query,
            limit=self.similarity_top_k,
            score_threshold=0.0  # Let LlamaIndex handle filtering
        )
        
        nodes_with_scores = []
        for doc, score in zip(documents, scores):
            # Create TextNode with metadata
            node = TextNode(
                text=doc['content'],
                metadata={
                    'source_file_id': doc['source_file_id'],
                    'source_file_url': doc['source_file_url'], 
                    'source_file_name': doc['source_file_name'],
                    'section_title': doc['section_title'],
                    'chunk_index': doc['chunk_index'],
                    'file_type': doc['file_type']
                }
            )
            
            # Create NodeWithScore
            node_with_score = NodeWithScore(node=node, score=score)
            nodes_with_scores.append(node_with_score)
        
        return nodes_with_scores

# Global service instance
vector_service = VectorService()

@asynccontextmanager
async def get_vector_service():
    """Async context manager for vector service."""
    if not vector_service.initialized:
        await vector_service.initialize()
    try:
        yield vector_service
    finally:
        pass  # Service remains alive for the application lifecycle