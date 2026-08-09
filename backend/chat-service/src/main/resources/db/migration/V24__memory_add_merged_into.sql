-- V24: Add merged_into_id field for memory merge tracking

-- 1) Add merged_into_id column (references the target memory this one was merged into)
ALTER TABLE user_memory
ADD COLUMN IF NOT EXISTS merged_into_id BIGINT REFERENCES user_memory(id);

-- 2) Create index for quick lookup of merged memories
CREATE INDEX IF NOT EXISTS idx_user_memory_merged_into
    ON user_memory(merged_into_id)
    WHERE merged_into_id IS NOT NULL;

-- 3) Add comment
COMMENT ON COLUMN user_memory.merged_into_id IS 'ID of the memory this record was merged into (NULL = not merged)';
