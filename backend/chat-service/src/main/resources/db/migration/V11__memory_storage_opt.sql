<<<<<<< HEAD
<<<<<<< HEAD:backend/chat-service/src/main/resources/db/migration/V11__memory_storage_opt.sql
-- V11: memory storage optimization (access heat + cleanup indexes)

-- 1) access heat fields
ALTER TABLE user_memory
ADD COLUMN IF NOT EXISTS access_count INT NOT NULL DEFAULT 0;

ALTER TABLE user_memory
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP;

-- 2) LRU/heat index
CREATE INDEX IF NOT EXISTS idx_user_memory_access
ON user_memory(user_id, kb_id, is_deleted, access_count DESC, last_accessed_at DESC NULLS LAST);

-- 3) soft-delete cleanup index
CREATE INDEX IF NOT EXISTS idx_user_memory_soft_deleted_stale
ON user_memory(is_deleted, updated_at)
WHERE is_deleted = true;

-- 4) low-confidence cleanup index
CREATE INDEX IF NOT EXISTS idx_user_memory_low_confidence_stale
ON user_memory(confidence, updated_at)
WHERE is_deleted = false AND confidence < 0.5;

COMMENT ON COLUMN user_memory.access_count IS 'Total retrieval hit count';
COMMENT ON COLUMN user_memory.last_accessed_at IS 'Latest retrieval hit timestamp';
COMMENT ON INDEX idx_user_memory_access IS 'Heat index for LRU-like ordering and cleanup';
=======
-- Placeholder migration to align with existing database history.
-- Keep version/description stable for Flyway validation.
SELECT 1;
>>>>>>> 1cfd0c3 (chore(flyway): 对齐V11/V12历史并新增V14审计描述迁移):backend/src/main/resources/db/migration/V11__memory_storage_opt.sql
=======
-- Placeholder migration to align with existing database history.
-- Keep version/description stable for Flyway validation.
SELECT 1;
>>>>>>> 051e97d (feat: 后端升级为Spring Cloud Alibaba多模块架构骨架并接入Gateway/Nacos/OTel)
