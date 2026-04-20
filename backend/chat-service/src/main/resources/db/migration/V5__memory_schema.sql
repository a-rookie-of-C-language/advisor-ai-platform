-- V5: Memory API schema for long-term memory and session summary

CREATE TABLE IF NOT EXISTS user_memory (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES sys_user(id) ON DELETE CASCADE,
    kb_id           BIGINT NOT NULL REFERENCES rag_knowledge_base(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    confidence      NUMERIC(4,3) NOT NULL DEFAULT 0.700,
    score           NUMERIC(6,4) NOT NULL DEFAULT 0.0000,
    memory_key      VARCHAR(128),
    source_turn_id  VARCHAR(64),
    tags            JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at      TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_user_memory_confidence CHECK (confidence >= 0 AND confidence <= 1)
);

CREATE INDEX IF NOT EXISTS idx_user_memory_scope
    ON user_memory(user_id, kb_id, is_deleted, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_memory_expire
    ON user_memory(user_id, kb_id, is_deleted, expires_at);

CREATE INDEX IF NOT EXISTS idx_user_memory_memory_key
    ON user_memory(memory_key);

CREATE INDEX IF NOT EXISTS idx_user_memory_tags
    ON user_memory USING GIN(tags);

CREATE TABLE IF NOT EXISTS session_summary (
    id          BIGSERIAL PRIMARY KEY,
    session_id  BIGINT NOT NULL UNIQUE REFERENCES chat_session(id) ON DELETE CASCADE,
    summary     TEXT NOT NULL,
    version     INT NOT NULL DEFAULT 1,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_summary_updated_at
    ON session_summary(updated_at DESC);
