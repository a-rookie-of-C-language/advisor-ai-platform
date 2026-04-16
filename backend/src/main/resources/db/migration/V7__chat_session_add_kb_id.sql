ALTER TABLE chat_session
    ADD COLUMN IF NOT EXISTS kb_id BIGINT;

UPDATE chat_session
SET kb_id = 0
WHERE kb_id IS NULL;

ALTER TABLE chat_session
    ALTER COLUMN kb_id SET DEFAULT 0;

ALTER TABLE chat_session
    ALTER COLUMN kb_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_session_kb_id ON chat_session(kb_id);
