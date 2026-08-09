-- V22: Add memory_type column to user_memory for semantic/episodic classification

-- 1) Add memory_type column with default 'semantic'
ALTER TABLE user_memory
ADD COLUMN IF NOT EXISTS memory_type VARCHAR(20) NOT NULL DEFAULT 'semantic';

-- 2) Create index for type-based filtering and aggregation
CREATE INDEX IF NOT EXISTS idx_user_memory_type
    ON user_memory(user_id, kb_id, memory_type);

-- 3) Add comment
COMMENT ON COLUMN user_memory.memory_type IS 'Memory classification: semantic (facts/preferences) or episodic (past events/experiences)';
