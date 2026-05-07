-- =========================================================
-- student-service 数据库初始化脚本
-- version: V1
-- description: 学生档案、学生待办、导入批次、快照表
-- =========================================================

-- 学生档案表
CREATE TABLE student_profile (
    id                      BIGSERIAL PRIMARY KEY,
    student_no              VARCHAR(32) NOT NULL UNIQUE COMMENT '学号（业务唯一键）',
    name                    VARCHAR(64) NOT NULL COMMENT '姓名',
    gender                  SMALLINT COMMENT '性别：0-女，1-男',
    grade                   VARCHAR(16) COMMENT '年级',
    major                   VARCHAR(128) COMMENT '专业',
    class_code              VARCHAR(64) COMMENT '班级编码',
    counselor_no            VARCHAR(32) COMMENT '辅导员工号',

    -- 联系方式
    phone                   VARCHAR(32) COMMENT '手机号',
    email                   VARCHAR(128) COMMENT '邮箱',
    dormitory               VARCHAR(128) COMMENT '宿舍地址',
    emergency_contact       VARCHAR(256) COMMENT '紧急联系人',

    -- 扩展预留
    extra_data              JSONB COMMENT '扩展数据JSON',

    -- 状态
    info_completeness       SMALLINT DEFAULT 0 COMMENT '信息完整度：0-完整，1-部分缺失，2-严重缺失',
    risk_level              SMALLINT DEFAULT 0 COMMENT '风险等级：0-正常，1-关注，2-预警，3-严重',

    -- 审计字段
    created_by              VARCHAR(64),
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by              VARCHAR(64),
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted                 SMALLINT DEFAULT 0,
    version                 INT DEFAULT 0,

    CONSTRAINT uk_student_no UNIQUE (student_no)
);

COMMENT ON TABLE student_profile IS '学生档案表';
COMMENT ON COLUMN student_profile.info_completeness IS '0-完整，1-部分缺失，2-严重缺失';
COMMENT ON COLUMN student_profile.risk_level IS '0-正常，1-关注，2-预警，3-严重';

-- 索引
CREATE INDEX idx_student_class_code ON student_profile(class_code);
CREATE INDEX idx_student_counselor_no ON student_profile(counselor_no);
CREATE INDEX idx_student_grade ON student_profile(grade);
CREATE INDEX idx_student_info_completeness ON student_profile(info_completeness);
CREATE INDEX idx_student_risk_level ON student_profile(risk_level);
CREATE INDEX idx_student_deleted ON student_profile(deleted);

-- =========================================================
-- 学生待办表
-- =========================================================
CREATE TABLE student_task (
    id                      BIGSERIAL PRIMARY KEY,
    student_id              BIGINT NOT NULL COMMENT '关联学生ID',
    task_type              VARCHAR(32) NOT NULL COMMENT '任务类型：INFO_MISSING-信息缺失',
    task_status             SMALLINT NOT NULL DEFAULT 0 COMMENT '状态：0-待处理，1-处理中，2-已完成，3-已关闭',
    assignee_no             VARCHAR(32) COMMENT '处理人工号',
    assignee_name           VARCHAR(64) COMMENT '处理人姓名',

    description             TEXT COMMENT '任务描述',
    handle_note            TEXT COMMENT '处理备注',
    handle_time            TIMESTAMP COMMENT '处理时间',

    created_by              VARCHAR(64),
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by              VARCHAR(64),
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_task_student FOREIGN KEY (student_id) REFERENCES student_profile(id) ON DELETE CASCADE
);

COMMENT ON TABLE student_task IS '学生待办表';
COMMENT ON COLUMN student_task.task_type IS 'INFO_MISSING-信息缺失';
COMMENT ON COLUMN student_task.task_status IS '0-待处理，1-处理中，2-已完成，3-已关闭';

CREATE INDEX idx_task_student_id ON student_task(student_id);
CREATE INDEX idx_task_status ON student_task(task_status);
CREATE INDEX idx_task_assignee_no ON student_task(assignee_no);
CREATE INDEX idx_task_type ON student_task(task_type);
CREATE INDEX idx_task_created_at ON student_task(created_at);

-- =========================================================
-- 学生档案快照表
-- =========================================================
CREATE TABLE student_snapshot (
    id                      BIGSERIAL PRIMARY KEY,
    student_id              BIGINT NOT NULL,
    student_no              VARCHAR(32) NOT NULL,
    semester                VARCHAR(16) COMMENT '学期，如 2024-2025-1',
    snapshot_type           VARCHAR(32) COMMENT '快照类型：SEMESTER-学期，BATCH-批次',
    snapshot_data           JSONB NOT NULL COMMENT '快照完整数据',

    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_snapshot_student FOREIGN KEY (student_id) REFERENCES student_profile(id) ON DELETE CASCADE
);

COMMENT ON TABLE student_snapshot IS '学生档案快照表';
COMMENT ON COLUMN student_snapshot.snapshot_type IS 'SEMESTER-学期，BATCH-批次';

CREATE INDEX idx_snapshot_student_id ON student_snapshot(student_id);
CREATE INDEX idx_snapshot_semester ON student_snapshot(semester);
CREATE INDEX idx_snapshot_type ON student_snapshot(snapshot_type);
CREATE INDEX idx_snapshot_created_at ON student_snapshot(created_at);

-- =========================================================
-- 导入批次表
-- =========================================================
CREATE TABLE import_batch (
    id                      BIGSERIAL PRIMARY KEY,
    batch_no                VARCHAR(64) NOT NULL UNIQUE COMMENT '批次号',
    file_name               VARCHAR(256) COMMENT '文件名',
    total_count             INT COMMENT '总行数',
    success_count          INT COMMENT '成功数',
    fail_count              INT COMMENT '失败数',
    duplicate_count         INT COMMENT '重复数',

    status                  SMALLINT DEFAULT 0 COMMENT '状态：0-处理中，1-完成，2-失败',
    fail_reason             TEXT COMMENT '失败原因',
    fail_details            JSONB COMMENT '失败明细',

    created_by              VARCHAR(64),
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_batch_no UNIQUE (batch_no)
);

COMMENT ON TABLE import_batch IS '导入批次表';
COMMENT ON COLUMN import_batch.status IS '0-处理中，1-完成，2-失败';

CREATE INDEX idx_batch_created_by ON import_batch(created_by);
CREATE INDEX idx_batch_created_at ON import_batch(created_at);
CREATE INDEX idx_batch_status ON import_batch(status);

-- =========================================================
-- 字段变更记录表
-- =========================================================
CREATE TABLE student_field_change (
    id                      BIGSERIAL PRIMARY KEY,
    student_id              BIGINT NOT NULL,
    student_no              VARCHAR(32) NOT NULL,
    field_name              VARCHAR(64) NOT NULL COMMENT '变更字段',
    old_value               TEXT COMMENT '旧值',
    new_value               TEXT COMMENT '新值',
    change_reason           VARCHAR(256) COMMENT '变更原因',
    batch_no                VARCHAR(64) COMMENT '关联批次号',

    changed_by              VARCHAR(64),
    changed_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_change_student FOREIGN KEY (student_id) REFERENCES student_profile(id) ON DELETE CASCADE
);

COMMENT ON TABLE student_field_change IS '字段变更记录表';

CREATE INDEX idx_change_student_id ON student_field_change(student_id);
CREATE INDEX idx_change_batch_no ON student_field_change(batch_no);
CREATE INDEX idx_change_field_name ON student_field_change(field_name);
CREATE INDEX idx_change_changed_at ON student_field_change(changed_at);

-- =========================================================
-- 预留扩展表 - 学业成绩
-- =========================================================
CREATE TABLE student_academic_score (
    id                      BIGSERIAL PRIMARY KEY,
    student_id              BIGINT NOT NULL,
    semester                VARCHAR(16) NOT NULL COMMENT '学年学期',
    course_name             VARCHAR(128) NOT NULL,
    score                   DECIMAL(5,2),
    credit                  DECIMAL(3,1),
    score_type              SMALLINT DEFAULT 0 COMMENT '0-正常，1-补考，2-重修',

    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_score_student FOREIGN KEY (student_id) REFERENCES student_profile(id) ON DELETE CASCADE,
    CONSTRAINT uk_score_student_semester_course UNIQUE (student_id, semester, course_name)
);

COMMENT ON TABLE student_academic_score IS '学生成绩表-预留';
COMMENT ON COLUMN student_academic_score.score_type IS '0-正常，1-补考，2-重修';

CREATE INDEX idx_score_student_id ON student_academic_score(student_id);
CREATE INDEX idx_score_semester ON student_academic_score(semester);

-- =========================================================
-- 预留扩展表 - 学业预警
-- =========================================================
CREATE TABLE student_academic_warning (
    id                      BIGSERIAL PRIMARY KEY,
    student_id              BIGINT NOT NULL,
    semester                VARCHAR(16) NOT NULL,
    warning_type            VARCHAR(32) NOT NULL COMMENT '预警类型',
    warning_level           SMALLINT NOT NULL COMMENT '等级：1-关注，2-预警，3-严重',
    warning_time            TIMESTAMP NOT NULL,
    description             TEXT COMMENT '预警描述',

    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_warning_student FOREIGN KEY (student_id) REFERENCES student_profile(id) ON DELETE CASCADE
);

COMMENT ON TABLE student_academic_warning IS '学业预警表-预留';
COMMENT ON COLUMN student_academic_warning.warning_level IS '1-关注，2-预警，3-严重';

CREATE INDEX idx_warning_student_id ON student_academic_warning(student_id);
CREATE INDEX idx_warning_semester ON student_academic_warning(semester);
CREATE INDEX idx_warning_level ON student_academic_warning(warning_level);

-- =========================================================
-- 预留扩展表 - 帮扶记录
-- =========================================================
CREATE TABLE student_support_record (
    id                      BIGSERIAL PRIMARY KEY,
    student_id              BIGINT NOT NULL,
    support_type            VARCHAR(32) NOT NULL COMMENT '帮扶类型：ACADEMIC-学业，PSYCHOLOGICAL-心理，CAREER-就业',
    support_teacher_no      VARCHAR(32) NOT NULL COMMENT '帮扶教师工号',
    support_teacher_name    VARCHAR(64) COMMENT '帮扶教师姓名',
    support_content         TEXT COMMENT '帮扶内容',
    support_date            DATE NOT NULL COMMENT '帮扶日期',
    follow_status           SMALLINT DEFAULT 0 COMMENT '跟进状态：0-待跟进，1-跟进中，2-已完成',

    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted                 SMALLINT DEFAULT 0,

    CONSTRAINT fk_support_student FOREIGN KEY (student_id) REFERENCES student_profile(id) ON DELETE CASCADE
);

COMMENT ON TABLE student_support_record IS '帮扶记录表-预留';
COMMENT ON COLUMN student_support_record.support_type IS 'ACADEMIC-学业，PSYCHOLOGICAL-心理，CAREER-就业';
COMMENT ON COLUMN student_support_record.follow_status IS '0-待跟进，1-跟进中，2-已完成';

CREATE INDEX idx_support_student_id ON student_support_record(student_id);
CREATE INDEX idx_support_type ON student_support_record(support_type);
CREATE INDEX idx_support_teacher ON student_support_record(support_teacher_no);
CREATE INDEX idx_support_status ON student_support_record(follow_status);
