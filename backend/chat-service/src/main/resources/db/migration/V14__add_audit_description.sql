ALTER TABLE audit_log
    ADD COLUMN IF NOT EXISTS description VARCHAR(256);

CREATE INDEX IF NOT EXISTS idx_audit_module_action_created
    ON audit_log(module, action, created_at DESC);
