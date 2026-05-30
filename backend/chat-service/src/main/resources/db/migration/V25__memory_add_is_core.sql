-- V25: Add is_core field for core memory identification

-- 1) Add is_core column
ALTER TABLE user_memory
ADD COLUMN IF NOT EXISTS is_core BOOLEAN NOT NULL DEFAULT FALSE;

-- 2) Create index for quick lookup of core memories
CREATE INDEX IF NOT EXISTS idx_user_memory_is_core
    ON user_memory(user_id, kb_id, is_core)
    WHERE is_core = TRUE AND is_deleted = FALSE;

-- 3) Add comment
COMMENT ON COLUMN user_memory.is_core IS 'Whether this is a core memory that should always be injected into context';
