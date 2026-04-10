-- V1: 初始化数据库表结构
-- 项目: 辅导员智库智能支持平台
-- 维护: cn.edu.cqut.advisorplatform

-- 用户表
CREATE TABLE sys_user (
    id         BIGSERIAL    PRIMARY KEY,
    username   VARCHAR(64)  NOT NULL UNIQUE,
    password   VARCHAR(256) NOT NULL,
    real_name  VARCHAR(64)  NOT NULL,
    phone      VARCHAR(32),
    email      VARCHAR(128),
    role       VARCHAR(16)  NOT NULL DEFAULT 'ADVISOR',
    enabled    BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- 政策表
CREATE TABLE policy (
    id           BIGSERIAL    PRIMARY KEY,
    title        VARCHAR(256) NOT NULL,
    content      TEXT,
    category     VARCHAR(64),
    source       VARCHAR(64),
    published_at TIMESTAMP,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- 案例表
CREATE TABLE case_study (
    id         BIGSERIAL    PRIMARY KEY,
    title      VARCHAR(256) NOT NULL,
    content    TEXT,
    category   VARCHAR(64),
    tags       VARCHAR(64),
    school     VARCHAR(64),
    created_at TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- 方法表
CREATE TABLE method (
    id          BIGSERIAL    PRIMARY KEY,
    title       VARCHAR(256) NOT NULL,
    description TEXT,
    steps       TEXT,
    scenario    VARCHAR(64),
    tags        VARCHAR(64),
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- 培训表
CREATE TABLE training (
    id           BIGSERIAL    PRIMARY KEY,
    title        VARCHAR(256) NOT NULL,
    description  TEXT,
    type         VARCHAR(64),
    resource_url VARCHAR(256),
    scheduled_at TIMESTAMP,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- 初始管理员账号（密码明文: Admin@123，BCrypt加密）
INSERT INTO sys_user (username, password, real_name, role)
VALUES ('admin',
        '$2a$10$N.zmdr9k7uOCQb376NoUnuTJ8iKSNre3aSvWGNNUBZfpGlMFBxEgm',
        '系统管理员',
        'ADMIN');
