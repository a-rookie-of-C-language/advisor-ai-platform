-- V2: 移除旧业务表，新增 RAG 知识库与 AI 对话表
-- 项目: 辅导员智库智能支持平台
-- 维护: cn.edu.cqut.advisorplatform

-- 删除旧业务表
DROP TABLE IF EXISTS policy CASCADE;
DROP TABLE IF EXISTS case_study CASCADE;
DROP TABLE IF EXISTS method CASCADE;
DROP TABLE IF EXISTS training CASCADE;

-- 启用 pgvector 扩展（需 PostgreSQL 已安装 pgvector 插件）
CREATE EXTENSION IF NOT EXISTS vector;

-- 知识库表
CREATE TABLE rag_knowledge_base (
    id          BIGSERIAL    PRIMARY KEY,
    name        VARCHAR(128) NOT NULL,
    description TEXT,
    created_by  BIGINT       REFERENCES sys_user(id) ON DELETE SET NULL,
    doc_count   INT          NOT NULL DEFAULT 0,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- 文档表
CREATE TABLE rag_document (
    id                  BIGSERIAL    PRIMARY KEY,
    knowledge_base_id   BIGINT       NOT NULL REFERENCES rag_knowledge_base(id) ON DELETE CASCADE,
    file_name           VARCHAR(256) NOT NULL,
    file_type           VARCHAR(32)  NOT NULL,
    file_size           BIGINT       NOT NULL DEFAULT 0,
    status              VARCHAR(32)  NOT NULL DEFAULT 'PENDING',
    uploaded_by         BIGINT       REFERENCES sys_user(id) ON DELETE SET NULL,
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- 文档向量块表（存储分块后的向量）
CREATE TABLE rag_document_chunk (
    id           BIGSERIAL    PRIMARY KEY,
    document_id  BIGINT       NOT NULL REFERENCES rag_document(id) ON DELETE CASCADE,
    chunk_index  INT          NOT NULL,
    content      TEXT         NOT NULL,
    embedding    vector(1536),
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- AI 对话会话表
CREATE TABLE chat_session (
    id          BIGSERIAL    PRIMARY KEY,
    title       VARCHAR(256) NOT NULL DEFAULT '新对话',
    user_id     BIGINT       REFERENCES sys_user(id) ON DELETE CASCADE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- AI 对话消息表
CREATE TABLE chat_message (
    id          BIGSERIAL    PRIMARY KEY,
    session_id  BIGINT       NOT NULL REFERENCES chat_session(id) ON DELETE CASCADE,
    role        VARCHAR(16)  NOT NULL CHECK (role IN ('user', 'assistant')),
    content     TEXT         NOT NULL,
    sources     JSONB,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- 索引优化
CREATE INDEX idx_rag_doc_kb_id ON rag_document(knowledge_base_id);
CREATE INDEX idx_chat_msg_session_id ON chat_message(session_id);
CREATE INDEX idx_chat_session_user_id ON chat_session(user_id);
