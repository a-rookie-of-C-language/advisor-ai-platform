CREATE TABLE IF NOT EXISTS user_identity (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES sys_user(id) ON DELETE CASCADE,
    identity_type VARCHAR(16) NOT NULL,
    identity_no VARCHAR(32) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_user_identity_user_type UNIQUE (user_id, identity_type),
    CONSTRAINT uk_user_identity_type_no UNIQUE (identity_type, identity_no)
);

CREATE INDEX IF NOT EXISTS idx_user_identity_user_id ON user_identity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_identity_identity_no ON user_identity(identity_no);
