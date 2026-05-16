-- V18: 为 rag_document_chunk 补充 metadata 字段
-- 项目: 辅导员智库智能支持平台

ALTER TABLE rag_document_chunk
    ADD COLUMN IF NOT EXISTS metadata JSONB;
