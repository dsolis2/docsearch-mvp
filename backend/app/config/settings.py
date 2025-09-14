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
    
    # Weaviate Configuration
    weaviate_url: str = Field(default="http://localhost:8080", description="Weaviate instance URL")
    weaviate_api_key: Optional[str] = Field(default=None, description="Weaviate API key")
    weaviate_class_name: str = Field(default="Documents", description="Weaviate class name")
    
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


def get_model_config(provider: str, model: str) -> dict:
    """Get configuration for a specific model."""
    return LLM_MODELS.get(provider, {}).get(model, {})


def validate_llm_config(provider: str, model: str) -> bool:
    """Validate if LLM provider and model combination is supported."""
    return provider in LLM_MODELS and model in LLM_MODELS[provider]


# Weaviate schema configuration
WEAVIATE_SCHEMA = {
    "class": settings.weaviate_class_name,
    "description": "Document chunks for RAG system",
    "vectorizer": "text2vec-openai",
    "moduleConfig": {
        "text2vec-openai": {
            "model": "ada-002",
            "modelVersion": "002",
            "type": "text"
        }
    },
    "properties": [
        {
            "name": "content",
            "dataType": ["text"],
            "description": "The actual content/text of the document chunk"
        },
        {
            "name": "source_file_id",
            "dataType": ["text"],
            "description": "Google Drive file ID or unique file identifier"
        },
        {
            "name": "source_file_url",
            "dataType": ["text"],
            "description": "URL to access the source file"
        },
        {
            "name": "source_file_name",
            "dataType": ["text"],
            "description": "Original filename"
        },
        {
            "name": "chunk_index",
            "dataType": ["int"],
            "description": "Index of this chunk within the document"
        },
        {
            "name": "page_number",
            "dataType": ["int"],
            "description": "Page number if applicable"
        },
        {
            "name": "metadata",
            "dataType": ["object"],
            "description": "Additional metadata about the document"
        },
        {
            "name": "created_at",
            "dataType": ["date"],
            "description": "When this chunk was created"
        },
        {
            "name": "updated_at",
            "dataType": ["date"],
            "description": "When this chunk was last updated"
        }
    ]
}