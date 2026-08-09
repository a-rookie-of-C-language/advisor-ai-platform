-- V23: Add temporal fields for memory lifecycle management

-- 1) Add valid_until column (NULL means currently valid)
ALTER TABLE user_memory
ADD COLUMN IF NOT EXISTS valid_until TIMESTAMP;

-- 2) Add supersedes_id column (references the memory this one replaces)
ALTER TABLE user_memory
ADD COLUMN IF NOT EXISTS supersedes_id BIGINT REFERENCES user_memory(id);

-- 3) Create index for efficient filtering of valid memories
CREATE INDEX IF NOT EXISTS idx_user_memory_valid_until
    ON user_memory(user_id, kb_id, valid_until)
    WHERE valid_until IS NOT NULL;

-- 4) Add comments
COMMENT ON COLUMN user_memory.valid_until IS 'Timestamp when this memory became invalid (NULL = currently valid)';
COMMENT ON COLUMN user_memory.supersedes_id IS 'ID of the memory that this record supersedes/replaces';
