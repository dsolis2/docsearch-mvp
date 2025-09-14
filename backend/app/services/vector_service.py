"""
Vector Service for RAG Chat API.

This service handles vector similarity search using Weaviate and 
integrates with LlamaIndex for RAG functionality.
"""

import asyncio
import logging
from typing import List, Dict, Any, Optional, Tuple
from contextlib import asynccontextmanager

import weaviate
import weaviate.classes as wvc
from llama_index.core import VectorStoreIndex, StorageContext
from llama_index.vector_stores.weaviate import WeaviateVectorStore
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core import Settings
from llama_index.core.schema import TextNode

from app.config.settings import settings

logger = logging.getLogger(__name__)

class VectorService:
    """Service for vector similarity search and retrieval using Weaviate."""
    
    def __init__(self):
        self.client: Optional[weaviate.WeaviateClient] = None
        self.vector_store: Optional[WeaviateVectorStore] = None
        self.index: Optional[VectorStoreIndex] = None
        self.embedding_model: Optional[OpenAIEmbedding] = None
        self.initialized = False
        self.collection_name = "Document"  # Weaviate v4 uses collections
    
    async def initialize(self):
        """Initialize Weaviate connection and LlamaIndex integration."""
        try:
            # Initialize Weaviate client (v4)
            self.client = weaviate.connect_to_local(
                port=8080,
                grpc_port=50051,
                skip_init_checks=True  # Skip gRPC checks since we only use REST
            )
            
            # Test connection
            if not self.client.is_ready():
                raise ConnectionError("Weaviate is not ready")
            
            logger.info(f"Connected to Weaviate at {settings.weaviate_url}")
            
            # Initialize embedding model
            if settings.openai_api_key:
                self.embedding_model = OpenAIEmbedding(
                    api_key=settings.openai_api_key,
                    model="text-embedding-ada-002"
                )
                Settings.embed_model = self.embedding_model
                logger.info("OpenAI embedding model initialized")
            else:
                logger.warning("No OpenAI API key provided for embeddings")
            
            # Initialize Weaviate vector store
            self.vector_store = WeaviateVectorStore(
                weaviate_client=self.client,
                index_name=self.collection_name,
                text_key="content"
            )
            
            # Create LlamaIndex vector store index
            storage_context = StorageContext.from_defaults(vector_store=self.vector_store)
            
            try:
                # Try to load existing index
                self.index = VectorStoreIndex.from_vector_store(
                    self.vector_store,
                    storage_context=storage_context
                )
                logger.info(f"Loaded existing vector index with collection: {self.collection_name}")
            except Exception as e:
                logger.warning(f"Could not load existing index, will create empty one: {e}")
                # Create new empty index
                self.index = VectorStoreIndex([], storage_context=storage_context)
            
            # Check if schema exists
            await self._ensure_schema_exists()
            
            self.initialized = True
            logger.info("Vector service initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize vector service: {e}")
            raise
    
    async def _ensure_schema_exists(self):
        """Ensure the required Weaviate collection exists."""
        try:
            # Check if collection already exists
            existing_collections = self.client.collections.list_all(simple=True)
            
            if self.collection_name not in existing_collections:
                logger.info(f"Creating Weaviate collection: {self.collection_name}")
                
                # Create collection - it should already exist from our seed script
                # but let's try to create it if needed
                try:
                    self.client.collections.create(
                        name=self.collection_name,
                        description="Document chunks for RAG retrieval",
                        properties=[
                            wvc.config.Property(name="content", data_type=wvc.config.DataType.TEXT),
                            wvc.config.Property(name="title", data_type=wvc.config.DataType.TEXT),
                            wvc.config.Property(name="source", data_type=wvc.config.DataType.TEXT),
                            wvc.config.Property(name="page", data_type=wvc.config.DataType.INT),
                            wvc.config.Property(name="document_type", data_type=wvc.config.DataType.TEXT),
                            wvc.config.Property(name="document_id", data_type=wvc.config.DataType.TEXT)
                        ]
                    )
                    logger.info(f"Created Weaviate collection: {self.collection_name}")
                except Exception as create_error:
                    logger.warning(f"Could not create collection: {create_error}")
            else:
                logger.info(f"Weaviate collection already exists: {self.collection_name}")
                
        except Exception as e:
            logger.error(f"Failed to ensure schema exists: {e}")
            # Don't raise here, as this might be a permissions issue
            # but the service might still work for querying
    
    async def similarity_search(
        self,
        query: str,
        limit: int = 5,
        score_threshold: float = 0.7,
        filters: Dict[str, Any] = None
    ) -> Tuple[List[Dict[str, Any]], List[float]]:
        """
        Perform similarity search in Weaviate.
        
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
            # Get the collection
            collection = self.client.collections.get(self.collection_name)
            
            # For demo purposes, use basic text search instead of vector search
            # Since we don't have embeddings configured
            response = collection.query.bm25(
                query=query,
                limit=limit
            )
            
            # Extract results
            documents = []
            scores = []
            
            for obj in response.objects:
                # For BM25, we'll use a simple score based on relevance
                # Since BM25 doesn't return distance/similarity scores in our setup
                score = 0.8  # Default high relevance for demo
                
                # Filter by score threshold
                if score >= score_threshold:
                    properties = obj.properties or {}
                    document = {
                        "content": properties.get("content", ""),
                        "source_file_id": properties.get("source", ""),  # Map to our seeded data
                        "source_file_url": "",  # Not in our demo data
                        "source_file_name": properties.get("source", ""),
                        "chunk_index": properties.get("page", 0),
                        "section_title": properties.get("title", ""),
                        "file_type": properties.get("document_type", ""),
                        "created_at": "",  # Not in our demo data
                        "relevance_score": score
                    }
                    documents.append(document)
                    scores.append(score)
            
            logger.info(f"Retrieved {len(documents)} documents for query: {query[:50]}...")
            return documents, scores
            
        except Exception as e:
            logger.error(f"Error in similarity search: {e}")
            return [], []
    
    async def get_query_engine(self, similarity_top_k: int = 5):
        """Get LlamaIndex query engine for RAG queries."""
        if not self.initialized:
            await self.initialize()
        
        if not self.index:
            raise ValueError("Vector index not initialized")
        
        # Create query engine
        query_engine = self.index.as_query_engine(
            similarity_top_k=similarity_top_k,
            response_mode="tree_summarize"
        )
        
        return query_engine
    
    async def get_retriever(self, similarity_top_k: int = 5):
        """Get LlamaIndex retriever for custom RAG workflows."""
        if not self.initialized:
            await self.initialize()
        
        if not self.index:
            raise ValueError("Vector index not initialized")
        
        return self.index.as_retriever(similarity_top_k=similarity_top_k)
    
    def _build_where_clause(self, filters: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Build Weaviate where clause from filters."""
        if not filters:
            return None
        
        where_conditions = []
        
        for key, value in filters.items():
            if key == "file_type" and isinstance(value, str):
                where_conditions.append({
                    "path": ["file_type"],
                    "operator": "Equal",
                    "valueString": value
                })
            elif key == "source_file_name" and isinstance(value, str):
                where_conditions.append({
                    "path": ["source_file_name"],
                    "operator": "Like",
                    "valueString": f"*{value}*"
                })
            elif key == "created_after" and isinstance(value, str):
                where_conditions.append({
                    "path": ["created_at"],
                    "operator": "GreaterThan",
                    "valueDate": value
                })
        
        if not where_conditions:
            return None
        
        if len(where_conditions) == 1:
            return where_conditions[0]
        else:
            return {
                "operator": "And",
                "operands": where_conditions
            }
    
    async def get_document_count(self) -> int:
        """Get total number of documents in the vector store."""
        if not self.initialized:
            await self.initialize()
        
        try:
            collection = self.client.collections.get(self.collection_name)
            response = collection.aggregate.over_all(
                total_count=True
            )
            return response.total_count if response.total_count else 0
        except Exception as e:
            logger.error(f"Error getting document count: {e}")
            return 0
    
    async def health_check(self) -> Dict[str, Any]:
        """Check health status of Weaviate connection."""
        if not self.initialized:
            return {"status": "not_initialized"}
        
        try:
            # Check if client is ready
            is_ready = self.client.is_ready()
            
            if not is_ready:
                return {"status": "error", "message": "Weaviate not ready"}
            
            # Get basic info
            doc_count = await self.get_document_count()
            
            # Check if collection exists
            existing_collections = self.client.collections.list_all(simple=True)
            schema_exists = self.collection_name in existing_collections
            
            return {
                "status": "healthy",
                "weaviate_url": settings.weaviate_url,
                "collection_name": self.collection_name,
                "schema_exists": schema_exists,
                "document_count": doc_count,
                "embedding_model": "text-embedding-ada-002" if self.embedding_model else None
            }
            
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def cleanup(self):
        """Clean up resources."""
        if self.client:
            self.client.close()
        
        self.client = None
        self.vector_store = None
        self.index = None
        self.embedding_model = None
        self.initialized = False
        logger.info("Vector service cleaned up")

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