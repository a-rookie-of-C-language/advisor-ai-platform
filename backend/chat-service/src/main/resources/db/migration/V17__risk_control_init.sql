CREATE TABLE IF NOT EXISTS risk_rules (
    id BIGSERIAL PRIMARY KEY,
    rule_type VARCHAR(32) NOT NULL,
    name VARCHAR(128) NOT NULL,
    pattern TEXT NOT NULL,
    action VARCHAR(32) NOT NULL,
    severity VARCHAR(16) NOT NULL,
    direction VARCHAR(16) NOT NULL DEFAULT 'BOTH',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_violations (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    violation_type VARCHAR(32) NOT NULL,
    rule_id BIGINT,
    request_path VARCHAR(512),
    request_body TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_bans (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    ban_type VARCHAR(32) NOT NULL,
    reason TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(64),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tracking_events (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    session_id VARCHAR(64),
    event_type VARCHAR(32) NOT NULL,
    event_name VARCHAR(64) NOT NULL,
    page_url VARCHAR(512),
    element_id VARCHAR(128),
    ip_address VARCHAR(45),
    user_agent TEXT,
    extra_data JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_behavior_stats (
    user_id BIGINT NOT NULL,
    date DATE NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0,
    violation_count INTEGER NOT NULL DEFAULT 0,
    avg_interval_seconds DOUBLE PRECISION,
    suspicious_pattern TEXT,
    PRIMARY KEY (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_risk_rules_enabled_direction ON risk_rules(enabled, direction);
CREATE INDEX IF NOT EXISTS idx_user_violations_user_created ON user_violations(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_bans_user_active_end ON user_bans(user_id, is_active, end_time);
CREATE INDEX IF NOT EXISTS idx_tracking_events_user_created ON tracking_events(user_id, created_at);
