-- V8__user_memory_add_vector_support.sql
-- 为 user_memory 表添加向量嵌入支持，用于语义相似度匹配

-- 1. 添加 embedding 列 (PostgreSQL vector 类型)
ALTER TABLE user_memory
ADD COLUMN IF NOT EXISTS embedding vector(1024);

-- 2. 创建 HNSW 索引加速余弦相似度搜索
-- HNSW 是 pgvector 推荐的高性能索引类型
CREATE INDEX IF NOT EXISTS idx_user_memory_embedding_hnsw
ON user_memory USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64)
WHERE is_deleted = false;

-- 3. 创建GIN索引用于全文检索（备用/降级方案）
CREATE INDEX IF NOT EXISTS idx_user_memory_content_trgm
ON user_memory USING gin (content gin_trgm_ops)
WHERE is_deleted = false;

-- 4. 添加注释
COMMENT ON COLUMN user_memory.embedding IS '文本向量嵌入 (bge-m3, 1024维)';
COMMENT ON INDEX idx_user_memory_embedding_hnsw IS 'HNSW向量索引，用于语义相似度搜索';
COMMENT ON INDEX idx_user_memory_content_trgm IS 'GIN-trigram索引，用于全文匹配降级方案';
