-- V17: 新增工作区文件表，支持聊天附件上传
-- 项目: 辅导员智库智能支持平台

-- 工作区文件表
CREATE TABLE IF NOT EXISTS workspace_file (
    id          BIGSERIAL    PRIMARY KEY,
    session_id  BIGINT       NOT NULL REFERENCES chat_session(id) ON DELETE CASCADE,
    file_name   VARCHAR(256) NOT NULL,
    file_type   VARCHAR(32)  NOT NULL,
    file_size   BIGINT       NOT NULL DEFAULT 0,
    file_path   VARCHAR(512) NOT NULL,
    uploaded_by BIGINT       REFERENCES sys_user(id) ON DELETE SET NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- chat_message 表新增 attachments 字段
ALTER TABLE chat_message ADD COLUMN IF NOT EXISTS attachments JSONB;

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_workspace_file_session_id ON workspace_file(session_id);
