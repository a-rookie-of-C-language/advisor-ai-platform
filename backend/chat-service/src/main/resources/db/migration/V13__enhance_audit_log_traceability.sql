ALTER TABLE audit_log
    ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE audit_log
    ADD COLUMN IF NOT EXISTS trace_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS session_id BIGINT,
    ADD COLUMN IF NOT EXISTS turn_id VARCHAR(128);

CREATE INDEX IF NOT EXISTS idx_audit_trace_id
    ON audit_log(trace_id);

CREATE INDEX IF NOT EXISTS idx_audit_session_created
    ON audit_log(session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_turn_id
    ON audit_log(turn_id);
