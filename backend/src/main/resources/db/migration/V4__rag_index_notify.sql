-- V4: 调整向量维度匹配bge-m3(1024)，新增file_path字段，创建NOTIFY触发器
-- 项目: 辅导员智库智能支持平台

-- 1. 修改向量维度: 1536 → 1024 (适配 bge-m3 模型)
ALTER TABLE rag_document_chunk DROP COLUMN IF EXISTS embedding;
ALTER TABLE rag_document_chunk ADD COLUMN embedding vector(1024);

-- 2. rag_document 新增 file_path 字段
ALTER TABLE rag_document ADD COLUMN IF NOT EXISTS file_path VARCHAR(512);

-- 3. 创建触发器函数: rag_document INSERT 后自动 NOTIFY
CREATE OR REPLACE FUNCTION notify_rag_index()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('rag_index', NEW.id::TEXT);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 绑定触发器到 rag_document 表 (仅 INSERT 且 status='PENDING')
DROP TRIGGER IF EXISTS trg_rag_index ON rag_document;
CREATE TRIGGER trg_rag_index
    AFTER INSERT ON rag_document
    FOR EACH ROW
    WHEN (NEW.status = 'PENDING')
    EXECUTE FUNCTION notify_rag_index();
