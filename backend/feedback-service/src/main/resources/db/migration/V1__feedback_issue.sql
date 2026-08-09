CREATE TABLE IF NOT EXISTS feedback_issue (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(256) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    github_sync_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    github_issue_number BIGINT,
    github_issue_url VARCHAR(512),
    github_state VARCHAR(32),
    github_last_synced_at TIMESTAMP,
    close_reason TEXT,
    created_by BIGINT REFERENCES sys_user(id) ON DELETE SET NULL,
    closed_by BIGINT REFERENCES sys_user(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feedback_issue_comment (
    id BIGSERIAL PRIMARY KEY,
    issue_id BIGINT NOT NULL REFERENCES feedback_issue(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    github_sync_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    github_comment_id BIGINT,
    github_comment_url VARCHAR(512),
    created_by BIGINT REFERENCES sys_user(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_issue_status ON feedback_issue(status);
CREATE INDEX IF NOT EXISTS idx_feedback_issue_created_at ON feedback_issue(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_issue_github_number ON feedback_issue(github_issue_number);
CREATE INDEX IF NOT EXISTS idx_feedback_issue_comment_issue_id ON feedback_issue_comment(issue_id);
