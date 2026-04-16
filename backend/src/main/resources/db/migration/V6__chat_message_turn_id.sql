ALTER TABLE chat_message ADD COLUMN IF NOT EXISTS turn_id VARCHAR(64);

UPDATE chat_message
SET turn_id = CONCAT('legacy-', id)
WHERE turn_id IS NULL OR turn_id = '';

ALTER TABLE chat_message ALTER COLUMN turn_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_chat_message_session_turn_role
    ON chat_message(session_id, turn_id, role);
