#!/usr/bin/env python3
"""
Google Drive to PostgreSQL RAG Ingestion Pipeline

This script downloads documents from Google Drive, converts them to markdown,
chunks the content, generates embeddings with VoyageAI, and stores everything
in a PostgreSQL database with pgvector for similarity search.

Usage:
    python ingest_gdrive.py --dry-run  # List files without processing
    python ingest_gdrive.py --max-files 5  # Process first 5 files
    python ingest_gdrive.py --resume  # Resume from last state
"""

import argparse
import asyncio
import hashlib
import json
import logging
import os
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass

import psycopg
import voyageai
from google.auth.credentials import Credentials
from google.oauth2.credentials import Credentials as OAuth2Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from markitdown import MarkItDown
from pgvector.psycopg import register_vector
from pydantic import field_validator
from pydantic_settings import BaseSettings
from tenacity import retry, stop_after_attempt, wait_exponential
from tqdm import tqdm

# Import chonkie with fallback
try:
    from chonkie import SemanticChunker, Chunk
    CHONKIE_AVAILABLE = True
except ImportError:
    CHONKIE_AVAILABLE = False
    logging.warning("Chonkie not available, using fallback chunker")


# Configuration
class Config(BaseSettings):
    # Required credentials
    google_client_id: str
    google_client_secret: str
    google_refresh_token: str
    voyage_api_key: str
    
    # Database connection
    database_url: str = "postgresql://localhost/docsearch_rag"
    
    # Processing options
    embedding_model: str = "voyage-2"
    embedding_dim: int = 1024
    chunk_size: int = 1200
    chunk_overlap: int = 200
    embed_qps: float = 4.0
    embed_concurrency: int = 2
    
    # File filtering
    include_mime_types: str = "application/pdf,application/vnd.google-apps.presentation"
    
    # Paths
    download_dir: Optional[str] = None
    
    # Logging
    log_level: str = "INFO"
    
    @field_validator('include_mime_types')
    @classmethod
    def parse_mime_types(cls, v):
        return [t.strip() for t in v.split(',')]
    
    class Config:
        env_prefix = ""
        case_sensitive = False


@dataclass
class DriveFile:
    id: str
    name: str
    mime_type: str
    modified_time: str
    web_view_link: str
    size_bytes: Optional[int] = None


@dataclass
class DocumentChunk:
    content: str
    chunk_index: int
    section_title: Optional[str] = None
    section_path: Optional[str] = None
    char_start: Optional[int] = None
    char_end: Optional[int] = None
    token_count: Optional[int] = None


class GoogleDriveClient:
    """Google Drive API client for authentication and file operations."""
    
    def __init__(self, config: Config):
        self.config = config
        self.service = None
        self._authenticate()
    
    def _authenticate(self):
        """Authenticate with Google Drive using refresh token."""
        credentials = OAuth2Credentials(
            token=None,
            refresh_token=self.config.google_refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=self.config.google_client_id,
            client_secret=self.config.google_client_secret
        )
        
        self.service = build('drive', 'v3', credentials=credentials)
        logging.info("Google Drive authenticated successfully")
    
    def list_files(self, max_files: Optional[int] = None) -> List[DriveFile]:
        """List files from Google Drive matching our criteria."""
        mime_filter = " or ".join([f"mimeType='{mt}'" for mt in self.config.include_mime_types])
        query = f"trashed=false and ({mime_filter})"
        
        files = []
        page_token = None
        
        while True:
            try:
                response = self.service.files().list(
                    q=query,
                    pageSize=min(1000, max_files - len(files) if max_files else 1000),
                    pageToken=page_token,
                    fields="nextPageToken, files(id, name, mimeType, modifiedTime, webViewLink, size)"
                ).execute()
                
                batch_files = response.get('files', [])
                for file_data in batch_files:
                    files.append(DriveFile(
                        id=file_data['id'],
                        name=file_data['name'],
                        mime_type=file_data['mimeType'],
                        modified_time=file_data['modifiedTime'],
                        web_view_link=file_data['webViewLink'],
                        size_bytes=int(file_data.get('size', 0)) if file_data.get('size') else None
                    ))
                
                page_token = response.get('nextPageToken')
                
                if not page_token or (max_files and len(files) >= max_files):
                    break
                    
            except HttpError as e:
                logging.error(f"Error listing Drive files: {e}")
                break
        
        logging.info(f"Found {len(files)} files in Google Drive")
        return files[:max_files] if max_files else files
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def download_file(self, file: DriveFile, download_path: Path) -> bool:
        """Download or export a file from Google Drive."""
        try:
            download_path.parent.mkdir(parents=True, exist_ok=True)
            
            if file.mime_type == "application/vnd.google-apps.presentation":
                # Export Google Slides as PPTX
                request = self.service.files().export_media(
                    fileId=file.id,
                    mimeType="application/vnd.openxmlformats-officedocument.presentationml.presentation"
                )
                final_path = download_path.with_suffix('.pptx')
            else:
                # Download PDF directly
                request = self.service.files().get_media(fileId=file.id)
                final_path = download_path
            
            with open(final_path, 'wb') as f:
                media = request.execute()
                f.write(media)
            
            logging.debug(f"Downloaded {file.name} to {final_path}")
            return True
            
        except Exception as e:
            logging.error(f"Failed to download {file.name}: {e}")
            return False


class FallbackChunker:
    """Simple markdown-aware chunker when Chonkie is not available."""
    
    def __init__(self, chunk_size: int = 1200, overlap: int = 200):
        self.chunk_size = chunk_size
        self.overlap = overlap
    
    def chunk(self, text: str) -> List[DocumentChunk]:
        """Simple chunking by character count with header awareness."""
        chunks = []
        
        # Split by headings first
        sections = self._split_by_headers(text)
        
        chunk_index = 0
        for section_title, section_text in sections:
            if len(section_text.strip()) == 0:
                continue
                
            # Split long sections into smaller chunks
            section_chunks = self._split_text(section_text, self.chunk_size, self.overlap)
            
            for chunk_text in section_chunks:
                chunks.append(DocumentChunk(
                    content=chunk_text.strip(),
                    chunk_index=chunk_index,
                    section_title=section_title,
                    token_count=len(chunk_text.split())  # Rough estimate
                ))
                chunk_index += 1
        
        return chunks
    
    def _split_by_headers(self, text: str) -> List[Tuple[Optional[str], str]]:
        """Split text by markdown headers."""
        lines = text.split('\n')
        sections = []
        current_header = None
        current_content = []
        
        for line in lines:
            if line.startswith('#'):
                # Save previous section
                if current_content or current_header is None:
                    sections.append((current_header, '\n'.join(current_content)))
                
                # Start new section
                current_header = line.strip('#').strip()
                current_content = []
            else:
                current_content.append(line)
        
        # Add final section
        if current_content:
            sections.append((current_header, '\n'.join(current_content)))
        
        return sections
    
    def _split_text(self, text: str, chunk_size: int, overlap: int) -> List[str]:
        """Split text into overlapping chunks."""
        if len(text) <= chunk_size:
            return [text]
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = min(start + chunk_size, len(text))
            chunk = text[start:end]
            chunks.append(chunk)
            
            if end >= len(text):
                break
                
            start = end - overlap
        
        return chunks


class DocumentProcessor:
    """Handles markdown conversion and chunking."""
    
    def __init__(self, config: Config):
        self.config = config
        self.markitdown = MarkItDown()
        
        if CHONKIE_AVAILABLE:
            self.chunker = SemanticChunker(
                chunk_size=config.chunk_size,
                overlap=config.chunk_overlap
            )
        else:
            self.chunker = FallbackChunker(
                chunk_size=config.chunk_size,
                overlap=config.chunk_overlap
            )
        
        logging.info(f"Using {'Chonkie' if CHONKIE_AVAILABLE else 'fallback'} chunker")
    
    def convert_to_markdown(self, file_path: Path) -> Tuple[str, str]:
        """Convert file to markdown and return (text, hash)."""
        try:
            result = self.markitdown.convert(str(file_path))
            markdown_text = result.text_content or ""
            text_hash = hashlib.sha256(markdown_text.encode()).hexdigest()
            return markdown_text, text_hash
        except Exception as e:
            logging.error(f"Failed to convert {file_path} to markdown: {e}")
            raise
    
    def chunk_document(self, markdown_text: str) -> List[DocumentChunk]:
        """Chunk the markdown text."""
        if CHONKIE_AVAILABLE:
            chonkie_chunks = self.chunker.chunk(markdown_text)
            chunks = []
            for i, chunk in enumerate(chonkie_chunks):
                chunks.append(DocumentChunk(
                    content=chunk.text,
                    chunk_index=i,
                    token_count=len(chunk.text.split())  # Rough estimate
                ))
            return chunks
        else:
            return self.chunker.chunk(markdown_text)


class EmbeddingService:
    """VoyageAI embedding service with rate limiting."""
    
    def __init__(self, config: Config):
        self.config = config
        self.client = voyageai.Client(api_key=config.voyage_api_key)
        self.rate_limiter = asyncio.Semaphore(config.embed_concurrency)
        
    async def embed_chunks(self, chunks: List[DocumentChunk]) -> List[List[float]]:
        """Generate embeddings for chunks with rate limiting."""
        embeddings = []
        
        # Process in batches
        batch_size = 32  # VoyageAI recommended batch size
        
        for i in tqdm(range(0, len(chunks), batch_size), desc="Generating embeddings"):
            batch = chunks[i:i + batch_size]
            batch_texts = [chunk.content for chunk in batch]
            
            batch_embeddings = await self._embed_batch(batch_texts)
            embeddings.extend(batch_embeddings)
            
            # Rate limiting
            if i + batch_size < len(chunks):
                await asyncio.sleep(1.0 / self.config.embed_qps)
        
        return embeddings
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def _embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Embed a batch of texts with retries."""
        async with self.rate_limiter:
            try:
                result = self.client.embed(
                    texts=texts,
                    model=self.config.embedding_model,
                    input_type="document"
                )
                return result.embeddings
            except Exception as e:
                logging.error(f"Embedding batch failed: {e}")
                raise


class DatabaseService:
    """PostgreSQL service for storing documents, chunks, and embeddings."""
    
    def __init__(self, config: Config):
        self.config = config
        self.connection = None
    
    def connect(self):
        """Connect to PostgreSQL and register vector type."""
        self.connection = psycopg.connect(self.config.database_url)
        register_vector(self.connection)
        logging.info("Connected to PostgreSQL database")
    
    def close(self):
        """Close database connection."""
        if self.connection:
            self.connection.close()
    
    def get_document_status(self, drive_file_id: str) -> Optional[Dict]:
        """Get document status from database."""
        with self.connection.cursor() as cur:
            cur.execute(
                "SELECT id, status, hash_sha256, drive_modified_time FROM documents WHERE drive_file_id = %s",
                (drive_file_id,)
            )
            row = cur.fetchone()
            if row:
                return {
                    'id': row[0],
                    'status': row[1], 
                    'hash_sha256': row[2],
                    'drive_modified_time': row[3]
                }
        return None
    
    def insert_document(self, file: DriveFile, hash_sha256: str, download_path: str) -> int:
        """Insert or update document record."""
        with self.connection.cursor() as cur:
            # Get file extension for file_type
            file_type = Path(file.name).suffix.lower() or 'unknown'
            
            cur.execute("""
                INSERT INTO documents (
                    drive_file_id, file_name, file_type, mime_type,
                    drive_web_view_link, drive_modified_time, download_path,
                    hash_sha256, status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (drive_file_id) DO UPDATE SET
                    file_name = EXCLUDED.file_name,
                    file_type = EXCLUDED.file_type,
                    drive_modified_time = EXCLUDED.drive_modified_time,
                    download_path = EXCLUDED.download_path,
                    hash_sha256 = EXCLUDED.hash_sha256,
                    status = EXCLUDED.status
                RETURNING id
            """, (
                file.id, file.name, file_type, file.mime_type,
                file.web_view_link, file.modified_time, download_path,
                hash_sha256, 'processing'
            ))
            
            return cur.fetchone()[0]
    
    def update_document_status(self, document_id: int, status: str, error_message: str = None):
        """Update document processing status."""
        with self.connection.cursor() as cur:
            if status == 'done':
                cur.execute(
                    "UPDATE documents SET status = %s, processed_at = NOW(), error_message = NULL WHERE id = %s",
                    (status, document_id)
                )
            else:
                cur.execute(
                    "UPDATE documents SET status = %s, error_message = %s WHERE id = %s",
                    (status, error_message, document_id)
                )
    
    def insert_chunks_and_embeddings(self, document_id: int, chunks: List[DocumentChunk], embeddings: List[List[float]]):
        """Insert chunks and their embeddings in a transaction."""
        with self.connection.cursor() as cur:
            # Clear existing chunks (will cascade to embeddings)
            cur.execute("DELETE FROM chunks WHERE document_id = %s", (document_id,))
            
            # Insert chunks and embeddings
            for chunk, embedding in zip(chunks, embeddings):
                # Insert chunk
                cur.execute("""
                    INSERT INTO chunks (
                        document_id, chunk_index, section_title, section_path,
                        char_start, char_end, token_count, content
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    document_id, chunk.chunk_index, chunk.section_title,
                    chunk.section_path, chunk.char_start, chunk.char_end,
                    chunk.token_count, chunk.content
                ))
                
                chunk_id = cur.fetchone()[0]
                
                # Insert embedding
                cur.execute(
                    "INSERT INTO embeddings (chunk_id, embedding) VALUES (%s, %s)",
                    (chunk_id, embedding)
                )
    
    def commit(self):
        """Commit current transaction."""
        self.connection.commit()


class IngestionController:
    """Main controller orchestrating the ingestion pipeline."""
    
    def __init__(self, config: Config):
        self.config = config
        self.drive_client = GoogleDriveClient(config)
        self.processor = DocumentProcessor(config)
        self.embedding_service = EmbeddingService(config)
        self.db_service = DatabaseService(config)
        
        # Setup logging
        logging.basicConfig(
            level=getattr(logging, config.log_level.upper()),
            format='%(asctime)s - %(levelname)s - %(message)s'
        )
    
    async def run(self, dry_run: bool = False, resume: bool = False, max_files: Optional[int] = None):
        """Run the complete ingestion pipeline."""
        logging.info(f"Starting ingestion pipeline (dry_run={dry_run}, resume={resume}, max_files={max_files})")
        
        # Connect to database
        if not dry_run:
            self.db_service.connect()
        
        try:
            # List files from Google Drive
            files = self.drive_client.list_files(max_files)
            
            if dry_run:
                self._log_dry_run_summary(files)
                return
            
            # Process each file
            download_dir = Path(self.config.download_dir) if self.config.download_dir else Path(tempfile.mkdtemp())
            
            stats = {'processed': 0, 'skipped': 0, 'errors': 0}
            
            for file in tqdm(files, desc="Processing files"):
                try:
                    result = await self._process_file(file, download_dir, resume)
                    if result == 'processed':
                        stats['processed'] += 1
                    elif result == 'skipped':
                        stats['skipped'] += 1
                except Exception as e:
                    logging.error(f"Failed to process {file.name}: {e}")
                    stats['errors'] += 1
                    
                    # Update status in DB
                    try:
                        doc_status = self.db_service.get_document_status(file.id)
                        if doc_status:
                            self.db_service.update_document_status(
                                doc_status['id'], 'error', str(e)
                            )
                            self.db_service.commit()
                    except:
                        pass
            
            # Final stats
            logging.info(f"Ingestion completed: {stats['processed']} processed, "
                        f"{stats['skipped']} skipped, {stats['errors']} errors")
                        
        finally:
            self.db_service.close()
    
    def _log_dry_run_summary(self, files: List[DriveFile]):
        """Log summary for dry run mode."""
        logging.info("=== DRY RUN SUMMARY ===")
        logging.info(f"Found {len(files)} files:")
        
        for file in files:
            size_str = f" ({file.size_bytes} bytes)" if file.size_bytes else ""
            logging.info(f"  - {file.name} ({file.mime_type}){size_str}")
        
        # Group by mime type
        mime_counts = {}
        for file in files:
            mime_counts[file.mime_type] = mime_counts.get(file.mime_type, 0) + 1
        
        logging.info("By type:")
        for mime_type, count in mime_counts.items():
            logging.info(f"  - {mime_type}: {count} files")
    
    async def _process_file(self, file: DriveFile, download_dir: Path, resume: bool) -> str:
        """Process a single file through the complete pipeline."""
        
        # Check if already processed
        doc_status = self.db_service.get_document_status(file.id)
        
        if resume and doc_status:
            if doc_status['status'] == 'done':
                logging.debug(f"Skipping {file.name} - already processed")
                return 'skipped'
            elif doc_status['status'] == 'processing':
                logging.info(f"Resuming processing for {file.name}")
        
        # Download file
        file_ext = '.pdf' if file.mime_type == 'application/pdf' else '.pptx'
        download_path = download_dir / file.id / f"{file.id}{file_ext}"
        
        if not self.drive_client.download_file(file, download_path):
            raise Exception("Failed to download file")
        
        # Convert to markdown
        markdown_text, text_hash = self.processor.convert_to_markdown(download_path)
        
        # Check if content changed
        if doc_status and doc_status.get('hash_sha256') == text_hash:
            logging.debug(f"Skipping {file.name} - content unchanged")
            return 'skipped'
        
        # Insert/update document record
        document_id = self.db_service.insert_document(file, text_hash, str(download_path))
        self.db_service.commit()
        
        try:
            # Chunk document
            chunks = self.processor.chunk_document(markdown_text)
            logging.info(f"Created {len(chunks)} chunks for {file.name}")
            
            if not chunks:
                raise Exception("No chunks created from document")
            
            # Generate embeddings
            embeddings = await self.embedding_service.embed_chunks(chunks)
            
            # Store in database
            self.db_service.insert_chunks_and_embeddings(document_id, chunks, embeddings)
            self.db_service.update_document_status(document_id, 'done')
            self.db_service.commit()
            
            logging.info(f"Successfully processed {file.name}")
            return 'processed'
            
        except Exception as e:
            self.db_service.update_document_status(document_id, 'error', str(e))
            self.db_service.commit()
            raise


def main():
    parser = argparse.ArgumentParser(description="Ingest Google Drive documents into PostgreSQL RAG system")
    parser.add_argument('--dry-run', action='store_true', help='List files without processing')
    parser.add_argument('--resume', action='store_true', help='Resume from last state')
    parser.add_argument('--max-files', type=int, help='Maximum number of files to process')
    parser.add_argument('--concurrency', type=int, default=2, help='Embedding concurrency')
    parser.add_argument('--qps', type=float, default=4.0, help='Embedding requests per second')
    parser.add_argument('--model', default='voyage-2', help='VoyageAI embedding model')
    parser.add_argument('--chunk-size', type=int, default=1200, help='Chunk size in tokens')
    parser.add_argument('--chunk-overlap', type=int, default=200, help='Chunk overlap')
    parser.add_argument('--download-dir', help='Directory to store downloaded files')
    parser.add_argument('--include-mime', help='Comma-separated mime types to include')
    
    args = parser.parse_args()
    
    # Override config with command line args
    config_dict = {}
    if args.concurrency:
        config_dict['embed_concurrency'] = args.concurrency
    if args.qps:
        config_dict['embed_qps'] = args.qps
    if args.model:
        config_dict['embedding_model'] = args.model
    if args.chunk_size:
        config_dict['chunk_size'] = args.chunk_size
    if args.chunk_overlap:
        config_dict['chunk_overlap'] = args.chunk_overlap
    if args.download_dir:
        config_dict['download_dir'] = args.download_dir
    if args.include_mime:
        config_dict['include_mime_types'] = args.include_mime
    
    # Load configuration
    config = Config(**config_dict)
    
    # Create and run controller
    controller = IngestionController(config)
    
    try:
        asyncio.run(controller.run(
            dry_run=args.dry_run,
            resume=args.resume, 
            max_files=args.max_files
        ))
    except KeyboardInterrupt:
        logging.info("Interrupted by user")
    except Exception as e:
        logging.error(f"Pipeline failed: {e}")
        raise


if __name__ == "__main__":
    main()