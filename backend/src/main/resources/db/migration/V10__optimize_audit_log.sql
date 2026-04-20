ALTER TABLE audit_log
    ALTER COLUMN request_uri TYPE VARCHAR(512);

CREATE INDEX IF NOT EXISTS idx_audit_user_module_created
    ON audit_log(user_id, module, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_module_created
    ON audit_log(module, created_at DESC);
