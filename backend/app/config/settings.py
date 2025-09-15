"""
Application settings and configuration management.
"""

from typing import List, Optional
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Server Configuration
    host: str = Field(default="localhost", description="Server host")
    port: int = Field(default=8000, description="Server port")
    debug: bool = Field(default=False, description="Debug mode")
    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:8080"],
        description="CORS allowed origins"
    )
    
    # API Keys
    openai_api_key: Optional[str] = Field(default=None, description="OpenAI API key")
    anthropic_api_key: Optional[str] = Field(default=None, description="Anthropic API key")
    voyage_api_key: Optional[str] = Field(default=None, description="VoyageAI API key for embeddings")
    
    # PostgreSQL Configuration
    database_url: str = Field(default="postgresql://localhost/docsearch_rag", description="PostgreSQL database URL")
    
    # Weaviate Configuration
    weaviate_url: Optional[str] = Field(default=None, description="Weaviate instance URL")
    weaviate_api_key: Optional[str] = Field(default=None, description="Weaviate API key")
    weaviate_class_name: str = Field(default="Documents", description="Weaviate class name")
    
    # Embedding Configuration
    embedding_model: str = Field(default="voyage-2", description="Embedding model name")
    embedding_dimension: int = Field(default=1024, description="Embedding vector dimension")
    
    # LLM Configuration
    default_llm_provider: str = Field(default="openai", description="Default LLM provider")
    default_model: str = Field(default="gpt-4o-mini", description="Default model name")
    max_tokens: int = Field(default=2000, description="Maximum tokens for responses")
    temperature: float = Field(default=0.7, description="LLM temperature")
    top_k_results: int = Field(default=5, description="Number of top results for RAG")
    
    # Session Storage
    mongodb_url: Optional[str] = Field(default=None, description="MongoDB connection URL")
    mongodb_database: str = Field(default="ragchat", description="MongoDB database name")
    mongodb_collection: str = Field(default="sessions", description="MongoDB collection name")
    
    # Logging
    log_level: str = Field(default="INFO", description="Logging level")
    log_format: str = Field(default="json", description="Log format")
    
    # Security
    secret_key: str = Field(default="dev-secret-key", description="Secret key for signing")
    access_token_expire_minutes: int = Field(default=30, description="Access token expiry")
    
    # Google Drive
    google_drive_api_key: Optional[str] = Field(default=None, description="Google Drive API key")
    
    # Rate Limiting
    rate_limit_requests: int = Field(default=100, description="Rate limit requests per window")
    rate_limit_window: int = Field(default=3600, description="Rate limit window in seconds")
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()


# LLM Model configurations
LLM_MODELS = {
    "openai": {
        "gpt-4o-mini": {
            "name": "gpt-4o-mini",
            "max_tokens": 128000,
            "supports_streaming": True,
            "cost_per_1k_tokens": 0.00015
        }
    }
}

# Weaviate Schema Configuration
WEAVIATE_SCHEMA = {
    "class": "Documents",
    "description": "Document chunks for RAG search",
    "properties": [
        {
            "name": "content",
            "dataType": ["text"],
            "description": "The document content"
        },
        {
            "name": "source_file_name",
            "dataType": ["string"],
            "description": "Source file name"
        },
        {
            "name": "chunk_id",
            "dataType": ["string"],
            "description": "Chunk identifier"
        },
        {
            "name": "metadata",
            "dataType": ["object"],
            "description": "Additional metadata"
        }
    ],
    "vectorizer": "none"
}


def get_model_config(provider: str, model: str) -> dict:
    """Get configuration for a specific model."""
    return LLM_MODELS.get(provider, {}).get(model, {})


def validate_llm_config(provider: str, model: str) -> bool:
    """Validate if LLM provider and model combination is supported."""
    return provider in LLM_MODELS and model in LLM_MODELS[provider]
