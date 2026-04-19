-- V11: 记忆存储效率优化 - 访问热度追踪 + 清理支持

-- 1. 新增访问热度字段
ALTER TABLE user_memory
ADD COLUMN IF NOT EXISTS access_count INT NOT NULL DEFAULT 0;

ALTER TABLE user_memory
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP;

-- 2. 新增访问热度索引（用于LRU排序和清理筛选）
CREATE INDEX IF NOT EXISTS idx_user_memory_access
ON user_memory(user_id, kb_id, is_deleted, access_count DESC, last_accessed_at DESC NULLS LAST);

-- 3. 新增软删除+过期时间复合索引（加速清理查询）
CREATE INDEX IF NOT EXISTS idx_user_memory_soft_deleted_stale
ON user_memory(is_deleted, updated_at)
WHERE is_deleted = true;

-- 4. 新增低置信度+陈旧记录索引（加速低质记忆清理）
CREATE INDEX IF NOT EXISTS idx_user_memory_low_confidence_stale
ON user_memory(confidence, updated_at)
WHERE is_deleted = false AND confidence < 0.5;

COMMENT ON COLUMN user_memory.access_count IS '累计被检索命中的次数';
COMMENT ON COLUMN user_memory.last_accessed_at IS '最近一次被检索命中时间';
COMMENT ON INDEX idx_user_memory_access IS '访问热度索引，用于LRU排序和智能淘汰';
