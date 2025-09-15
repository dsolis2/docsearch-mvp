-- PostgreSQL schema for RAG document ingestion pipeline
-- Requires pgvector extension for vector embeddings

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table: stores metadata about ingested files from Google Drive
CREATE TABLE IF NOT EXISTS documents (
    id BIGSERIAL PRIMARY KEY,
    drive_file_id TEXT UNIQUE NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    drive_web_view_link TEXT,
    drive_modified_time TIMESTAMPTZ,
    download_path TEXT,
    hash_sha256 TEXT,
    source TEXT NOT NULL DEFAULT 'gdrive',
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'processing', 'done', 'error')),
    error_message TEXT,
    upload_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Chunks table: stores chunked content from documents
CREATE TABLE IF NOT EXISTS chunks (
    id BIGSERIAL PRIMARY KEY,
    document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    section_title TEXT,
    section_path TEXT,
    char_start INTEGER,
    char_end INTEGER,
    token_count INTEGER,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(document_id, chunk_index)
);

-- Embeddings table: stores vector embeddings for chunks
-- Using 1024 dimensions for voyage-2 model
CREATE TABLE IF NOT EXISTS embeddings (
    id BIGSERIAL PRIMARY KEY,
    chunk_id BIGINT NOT NULL UNIQUE REFERENCES chunks(id) ON DELETE CASCADE,
    embedding VECTOR(1024) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_drive_file_id ON documents(drive_file_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_hash_sha256 ON documents(hash_sha256);
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);

-- Vector similarity index (using IVFFlat with cosine distance)
-- Start with lists=100, can be adjusted based on corpus size
CREATE INDEX IF NOT EXISTS idx_embeddings_vector 
ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create a view for easy querying with all related data
CREATE OR REPLACE VIEW document_chunks_with_embeddings AS
SELECT 
    d.id as document_id,
    d.drive_file_id,
    d.file_name,
    d.file_type,
    d.mime_type,
    d.drive_web_view_link,
    d.drive_modified_time,
    d.status as document_status,
    d.processed_at,
    c.id as chunk_id,
    c.chunk_index,
    c.section_title,
    c.section_path,
    c.content,
    c.token_count,
    e.id as embedding_id
FROM documents d
JOIN chunks c ON d.id = c.document_id
JOIN embeddings e ON c.id = e.chunk_id;

-- Function to get similar chunks by vector search
-- Usage: SELECT * FROM search_similar_chunks(query_embedding, limit) ORDER BY similarity DESC;
CREATE OR REPLACE FUNCTION search_similar_chunks(
    query_embedding VECTOR(1024),
    result_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
    chunk_id BIGINT,
    document_id BIGINT,
    drive_file_id TEXT,
    file_name TEXT,
    section_title TEXT,
    content TEXT,
    drive_web_view_link TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        d.id,
        d.drive_file_id,
        d.file_name,
        c.section_title,
        c.content,
        d.drive_web_view_link,
        1 - (e.embedding <=> query_embedding) as similarity
    FROM embeddings e
    JOIN chunks c ON e.chunk_id = c.id
    JOIN documents d ON c.document_id = d.id
    WHERE d.status = 'done'
    ORDER BY e.embedding <=> query_embedding
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Add some useful constraints and comments
COMMENT ON TABLE documents IS 'Stores metadata for documents ingested from Google Drive';
COMMENT ON TABLE chunks IS 'Stores text chunks extracted from documents';  
COMMENT ON TABLE embeddings IS 'Stores vector embeddings for text chunks using voyage-2 model (1024 dims)';
COMMENT ON FUNCTION search_similar_chunks IS 'Performs cosine similarity search over embeddings';