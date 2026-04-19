-- V12: 异步记忆提取任务表 - 支持后台Worker批量处理

CREATE TABLE IF NOT EXISTS memory_task (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL,
    kb_id       BIGINT NOT NULL,
    session_id  BIGINT NOT NULL,
    turn_id     VARCHAR(64) NOT NULL,
    status      VARCHAR(16) NOT NULL DEFAULT 'pending',
    payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
    retry_count INT NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP,

    CONSTRAINT chk_memory_task_status CHECK (status IN ('pending', 'processing', 'done', 'failed')),
    CONSTRAINT uq_memory_task_turn UNIQUE (session_id, turn_id)
);

CREATE INDEX IF NOT EXISTS idx_memory_task_pending
ON memory_task(status, created_at ASC)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_memory_task_session
ON memory_task(session_id, status);

COMMENT ON TABLE memory_task IS '异步记忆提取任务队列，用于后台Worker批量处理';
COMMENT ON COLUMN memory_task.turn_id IS '对话轮次ID，唯一约束防止重复投递';
COMMENT ON COLUMN memory_task.status IS 'pending=待处理 / processing=处理中 / done=完成 / failed=失败';
COMMENT ON COLUMN memory_task.payload IS '任务载荷: {user_text, assistant_text, recent_messages}';
