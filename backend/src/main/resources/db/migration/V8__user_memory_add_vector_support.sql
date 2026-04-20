-- V8__user_memory_add_vector_support.sql
-- Add vector and trigram search capabilities for user_memory.

-- 0) Ensure required extensions exist.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1) Add embedding column (pgvector type).
ALTER TABLE user_memory
ADD COLUMN IF NOT EXISTS embedding vector(1024);

-- 2) Create HNSW index for semantic retrieval.
CREATE INDEX IF NOT EXISTS idx_user_memory_embedding_hnsw
ON user_memory USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64)
WHERE is_deleted = false;

-- 3) Create trigram index for fallback text matching.
-- If pg_trgm is unavailable due to permission restrictions, do not fail migration.
DO $$
BEGIN
    CREATE INDEX IF NOT EXISTS idx_user_memory_content_trgm
    ON user_memory USING gin (content gin_trgm_ops)
    WHERE is_deleted = false;
EXCEPTION
    WHEN insufficient_privilege OR undefined_object THEN
        RAISE NOTICE 'Skip idx_user_memory_content_trgm: pg_trgm unavailable or insufficient privilege';
END
$$;

-- 4) Add comments.
COMMENT ON COLUMN user_memory.embedding IS 'Text embedding vector (bge-m3, 1024 dims)';
COMMENT ON INDEX idx_user_memory_embedding_hnsw IS 'HNSW vector index for semantic similarity search';
COMMENT ON INDEX idx_user_memory_content_trgm IS 'GIN trigram index for fallback full-text matching';
