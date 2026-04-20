-- Audit Log Table for tracking user operations
CREATE TABLE audit_log (
    id              BIGSERIAL    PRIMARY KEY,
    user_id         BIGINT       NOT NULL,
    username        VARCHAR(64),
    module          VARCHAR(32)  NOT NULL,
    action          VARCHAR(32)  NOT NULL,
    method          VARCHAR(128) NOT NULL,
    request_uri     VARCHAR(256),
    request_params  TEXT,
    response_status VARCHAR(16),
    response_data   TEXT,
    ip_address      VARCHAR(64),
    user_agent      VARCHAR(256),
    duration_ms     BIGINT,
    error_message   TEXT,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_module_action ON audit_log(module, action);
CREATE INDEX idx_audit_created_at ON audit_log(created_at);

COMMENT ON TABLE audit_log IS 'User operation audit log';
COMMENT ON COLUMN audit_log.user_id IS 'User ID who performed the operation';
COMMENT ON COLUMN audit_log.module IS 'Module: AUTH, RAG, MEMORY, CHAT';
COMMENT ON COLUMN audit_log.action IS 'Action: LOGIN, LOGOUT, SEARCH, etc.';
COMMENT ON COLUMN audit_log.method IS 'Full method name of the controller';
COMMENT ON COLUMN audit_log.request_params IS 'Request parameters in JSON format';
COMMENT ON COLUMN audit_log.response_data IS 'Response data in JSON format (if enabled)';
COMMENT ON COLUMN audit_log.ip_address IS 'Client IP address';
COMMENT ON COLUMN audit_log.duration_ms IS 'Method execution time in milliseconds';
