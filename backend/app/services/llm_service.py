"""
LLM Service for RAG Chat API.

This service provides a unified interface for different LLM providers
(OpenAI, Anthropic) and integrates with LlamaIndex for RAG functionality.
"""

import asyncio
import logging
from typing import AsyncGenerator, Dict, Any, Optional, List
from contextlib import asynccontextmanager

from llama_index.core import Settings
from llama_index.core.llms import LLM
from llama_index.llms.openai import OpenAI
from llama_index.llms.anthropic import Anthropic
from llama_index.core.callbacks import CallbackManager, TokenCountingHandler
from llama_index.core.node_parser import SentenceSplitter

from app.config.settings import settings
from app.models.chat_models import ChatMessage, StreamingChunk

logger = logging.getLogger(__name__)

class LLMService:
    """Service for managing LLM providers and RAG queries."""
    
    def __init__(self):
        self.providers: Dict[str, LLM] = {}
        self.token_counter = TokenCountingHandler()
        self.callback_manager = CallbackManager([self.token_counter])
        self.initialized = False
    
    async def initialize(self):
        """Initialize LLM providers based on available API keys."""
        try:
            # Initialize OpenAI if API key is available
            if settings.openai_api_key:
                self.providers['gpt-4o-mini'] = OpenAI(
                    model="gpt-4o-mini",
                    api_key=settings.openai_api_key,
                    temperature=0.1,
                    max_tokens=1000,
                    callback_manager=self.callback_manager
                )
                
                logger.info("OpenAI GPT-4o-mini provider initialized")
            
            # Set default LLM for LlamaIndex
            if self.providers:
                default_provider = list(self.providers.values())[0]
                Settings.llm = default_provider
                Settings.callback_manager = self.callback_manager
                
                # Configure node parser
                Settings.node_parser = SentenceSplitter(
                    chunk_size=512,
                    chunk_overlap=20
                )
                
                logger.info(f"Default LLM set to: {list(self.providers.keys())[0]}")
            else:
                raise ValueError("No LLM providers configured. Please set OpenAI or Anthropic API keys.")
            
            self.initialized = True
            logger.info(f"LLM Service initialized with {len(self.providers)} providers")
            
        except Exception as e:
            logger.error(f"Failed to initialize LLM service: {e}")
            raise
    
    def get_available_models(self) -> List[str]:
        """Get list of available model identifiers."""
        return list(self.providers.keys())
    
    def get_provider(self, model_name: str) -> Optional[LLM]:
        """Get LLM provider by model name."""
        return self.providers.get(model_name)
    
    async def stream_completion(
        self,
        messages: List[ChatMessage],
        model_name: str = None,
        context: str = None,
        citations: List[Dict[str, Any]] = None
    ) -> AsyncGenerator[StreamingChunk, None]:
        """
        Stream completion from LLM with optional RAG context.
        
        Args:
            messages: Chat conversation history
            model_name: Specific model to use (defaults to first available)
            context: RAG context from vector search
            citations: Source citations for context
        
        Yields:
            StreamingChunk: Token chunks with metadata
        """
        if not self.initialized:
            await self.initialize()
        
        # Select LLM provider
        if model_name and model_name in self.providers:
            llm = self.providers[model_name]
        else:
            llm = list(self.providers.values())[0]
            model_name = list(self.providers.keys())[0]
        
        try:
            # Construct prompt with RAG context if provided
            prompt = self._build_prompt(messages, context, citations)
            
            # Start token counting
            self.token_counter.reset_counts()
            
            # Stream response
            response_stream = await llm.astream_complete(prompt)
            
            async for token in response_stream:
                chunk = StreamingChunk(
                    content=str(token.delta),
                    model=model_name,
                    finish_reason=None,
                    usage={
                        "prompt_tokens": self.token_counter.prompt_llm_token_count,
                        "completion_tokens": self.token_counter.completion_llm_token_count,
                        "total_tokens": self.token_counter.total_llm_token_count
                    }
                )
                yield chunk
            
            # Final chunk with finish reason
            final_chunk = StreamingChunk(
                content="",
                model=model_name,
                finish_reason="stop",
                usage={
                    "prompt_tokens": self.token_counter.prompt_llm_token_count,
                    "completion_tokens": self.token_counter.completion_llm_token_count,
                    "total_tokens": self.token_counter.total_llm_token_count
                }
            )
            yield final_chunk
            
        except Exception as e:
            logger.error(f"Error in stream_completion: {e}")
            # Yield error chunk
            error_chunk = StreamingChunk(
                content=f"Error: {str(e)}",
                model=model_name or "unknown",
                finish_reason="error",
                usage={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
            )
            yield error_chunk
    
    def _build_prompt(
        self,
        messages: List[ChatMessage],
        context: str = None,
        citations: List[Dict[str, Any]] = None
    ) -> str:
        """Build complete prompt with conversation history and RAG context."""
        
        # System prompt for RAG
        system_prompt = """You are a helpful AI assistant that answers questions based on provided context documents. 

Instructions:
1. Use the provided context to answer questions accurately and thoroughly
2. If information is not in the context, clearly state that you don't have that information
3. Always cite specific sources when referencing information from the context
4. Be conversational but informative
5. If no context is provided, answer based on your general knowledge but mention this limitation

"""
        
        # Add context section if provided
        if context:
            system_prompt += f"\n## Context Documents:\n{context}\n\n"
            
            if citations:
                system_prompt += "## Available Sources:\n"
                for i, citation in enumerate(citations, 1):
                    source_name = citation.get('source_file_name', f'Source {i}')
                    system_prompt += f"[{i}] {source_name}\n"
                system_prompt += "\n"
        
        # Build conversation prompt
        conversation = []
        conversation.append(system_prompt)
        
        for message in messages:
            role = message.role
            content = message.content
            
            if role == "user":
                conversation.append(f"Human: {content}")
            elif role == "assistant":
                conversation.append(f"Assistant: {content}")
        
        # Add final human prompt
        conversation.append("Assistant:")
        
        return "\n\n".join(conversation)
    
    async def health_check(self) -> Dict[str, Any]:
        """Check health status of all LLM providers."""
        if not self.initialized:
            return {"status": "not_initialized", "providers": []}
        
        health_status = {
            "status": "healthy",
            "providers": []
        }
        
        for provider_name, llm in self.providers.items():
            try:
                # Simple test completion
                test_response = await llm.acomplete("Test")
                provider_status = {
                    "name": provider_name,
                    "status": "healthy",
                    "model": getattr(llm, 'model', 'unknown')
                }
            except Exception as e:
                provider_status = {
                    "name": provider_name,
                    "status": "error",
                    "error": str(e),
                    "model": getattr(llm, 'model', 'unknown')
                }
                health_status["status"] = "degraded"
            
            health_status["providers"].append(provider_status)
        
        return health_status
    
    async def cleanup(self):
        """Clean up resources."""
        self.providers.clear()
        self.initialized = False
        logger.info("LLM Service cleaned up")

# Global service instance
llm_service = LLMService()

@asynccontextmanager
async def get_llm_service():
    """Async context manager for LLM service."""
    if not llm_service.initialized:
        await llm_service.initialize()
    try:
        yield llm_service
    finally:
        pass  # Service remains alive for the application lifecycle