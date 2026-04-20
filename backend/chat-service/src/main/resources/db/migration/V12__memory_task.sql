<<<<<<< HEAD
-- V12: async memory extraction task queue

CREATE TABLE IF NOT EXISTS memory_task (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT NOT NULL,
    kb_id         BIGINT NOT NULL,
    session_id    BIGINT NOT NULL,
    turn_id       VARCHAR(64) NOT NULL,
    status        VARCHAR(16) NOT NULL DEFAULT 'pending',
    payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
    retry_count   INT NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    processed_at  TIMESTAMP,

    CONSTRAINT chk_memory_task_status
        CHECK (status IN ('pending', 'processing', 'done', 'failed')),
    CONSTRAINT uq_memory_task_turn
        UNIQUE (session_id, turn_id)
);

CREATE INDEX IF NOT EXISTS idx_memory_task_pending
ON memory_task(status, created_at ASC)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_memory_task_session
ON memory_task(session_id, status);

COMMENT ON TABLE memory_task IS 'Async memory extraction task queue for background workers';
COMMENT ON COLUMN memory_task.turn_id IS 'Conversation turn id, unique within one session';
COMMENT ON COLUMN memory_task.status IS 'pending/processing/done/failed';
COMMENT ON COLUMN memory_task.payload IS 'Task payload, e.g. user_text/assistant_text/recent_messages';
=======
-- Placeholder migration to align with existing database history.
-- Keep version/description stable for Flyway validation.
SELECT 1;
>>>>>>> 051e97d (feat: 后端升级为Spring Cloud Alibaba多模块架构骨架并接入Gateway/Nacos/OTel)
