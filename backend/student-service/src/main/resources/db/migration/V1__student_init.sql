-- =========================================================
-- student-service 数据库初始化脚本
-- version: V1
-- description: 学生档案、学生待办、导入批次、快照表
-- =========================================================

CREATE TABLE student_profile (
    id BIGSERIAL PRIMARY KEY,
    student_no VARCHAR(32) NOT NULL,
    name VARCHAR(64) NOT NULL,
    gender SMALLINT,
    grade VARCHAR(16),
    major VARCHAR(128),
    class_code VARCHAR(64),
    counselor_no VARCHAR(32),
    phone VARCHAR(32),
    email VARCHAR(128),
    dormitory VARCHAR(128),
    emergency_contact VARCHAR(256),
    extra_data JSONB,
    info_completeness SMALLINT DEFAULT 0,
    risk_level SMALLINT DEFAULT 0,
    created_by VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(64),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted SMALLINT DEFAULT 0,
    version INT DEFAULT 0,
    CONSTRAINT uk_student_no UNIQUE (student_no)
);

COMMENT ON TABLE student_profile IS '学生档案表';
COMMENT ON COLUMN student_profile.student_no IS '学号（业务唯一键）';
COMMENT ON COLUMN student_profile.name IS '姓名';
COMMENT ON COLUMN student_profile.gender IS '性别：0-女，1-男';
COMMENT ON COLUMN student_profile.grade IS '年级';
COMMENT ON COLUMN student_profile.major IS '专业';
COMMENT ON COLUMN student_profile.class_code IS '班级编码';
COMMENT ON COLUMN student_profile.counselor_no IS '辅导员工号';
COMMENT ON COLUMN student_profile.phone IS '手机号';
COMMENT ON COLUMN student_profile.email IS '邮箱';
COMMENT ON COLUMN student_profile.dormitory IS '宿舍地址';
COMMENT ON COLUMN student_profile.emergency_contact IS '紧急联系人';
COMMENT ON COLUMN student_profile.extra_data IS '扩展数据JSON';
COMMENT ON COLUMN student_profile.info_completeness IS '信息完整度：0-完整，1-部分缺失，2-严重缺失';
COMMENT ON COLUMN student_profile.risk_level IS '风险等级：0-正常，1-关注，2-预警，3-严重';

CREATE INDEX idx_student_class_code ON student_profile(class_code);
CREATE INDEX idx_student_counselor_no ON student_profile(counselor_no);
CREATE INDEX idx_student_grade ON student_profile(grade);
CREATE INDEX idx_student_info_completeness ON student_profile(info_completeness);
CREATE INDEX idx_student_risk_level ON student_profile(risk_level);
CREATE INDEX idx_student_deleted ON student_profile(deleted);

CREATE TABLE student_task (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    task_type VARCHAR(32) NOT NULL,
    task_status SMALLINT NOT NULL DEFAULT 0,
    assignee_no VARCHAR(32),
    assignee_name VARCHAR(64),
    description TEXT,
    handle_note TEXT,
    handle_time TIMESTAMP,
    created_by VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(64),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_student FOREIGN KEY (student_id) REFERENCES student_profile(id) ON DELETE CASCADE
);

COMMENT ON TABLE student_task IS '学生待办表';
COMMENT ON COLUMN student_task.student_id IS '关联学生ID';
COMMENT ON COLUMN student_task.task_type IS 'INFO_MISSING-信息缺失';
COMMENT ON COLUMN student_task.task_status IS '0-待处理，1-处理中，2-已完成，3-已关闭';
COMMENT ON COLUMN student_task.assignee_no IS '处理人工号';
COMMENT ON COLUMN student_task.assignee_name IS '处理人姓名';
COMMENT ON COLUMN student_task.description IS '任务描述';
COMMENT ON COLUMN student_task.handle_note IS '处理备注';
COMMENT ON COLUMN student_task.handle_time IS '处理时间';

CREATE INDEX idx_task_student_id ON student_task(student_id);
CREATE INDEX idx_task_status ON student_task(task_status);
CREATE INDEX idx_task_assignee_no ON student_task(assignee_no);
CREATE INDEX idx_task_type ON student_task(task_type);
CREATE INDEX idx_task_created_at ON student_task(created_at);

CREATE TABLE student_snapshot (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    student_no VARCHAR(32) NOT NULL,
    semester VARCHAR(16),
    snapshot_type VARCHAR(32),
    snapshot_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_snapshot_student FOREIGN KEY (student_id) REFERENCES student_profile(id) ON DELETE CASCADE
);

COMMENT ON TABLE student_snapshot IS '学生档案快照表';
COMMENT ON COLUMN student_snapshot.semester IS '学期，如 2024-2025-1';
COMMENT ON COLUMN student_snapshot.snapshot_type IS '快照类型：SEMESTER-学期，BATCH-批次';
COMMENT ON COLUMN student_snapshot.snapshot_data IS '快照完整数据';

CREATE INDEX idx_snapshot_student_id ON student_snapshot(student_id);
CREATE INDEX idx_snapshot_semester ON student_snapshot(semester);
CREATE INDEX idx_snapshot_type ON student_snapshot(snapshot_type);
CREATE INDEX idx_snapshot_created_at ON student_snapshot(created_at);

CREATE TABLE import_batch (
    id BIGSERIAL PRIMARY KEY,
    batch_no VARCHAR(64) NOT NULL,
    file_name VARCHAR(256),
    total_count INT,
    success_count INT,
    fail_count INT,
    duplicate_count INT,
    status SMALLINT DEFAULT 0,
    fail_reason TEXT,
    fail_details JSONB,
    created_by VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_batch_no UNIQUE (batch_no)
);

COMMENT ON TABLE import_batch IS '导入批次表';
COMMENT ON COLUMN import_batch.batch_no IS '批次号';
COMMENT ON COLUMN import_batch.file_name IS '文件名';
COMMENT ON COLUMN import_batch.total_count IS '总行数';
COMMENT ON COLUMN import_batch.success_count IS '成功数';
COMMENT ON COLUMN import_batch.fail_count IS '失败数';
COMMENT ON COLUMN import_batch.duplicate_count IS '重复数';
COMMENT ON COLUMN import_batch.status IS '0-处理中，1-完成，2-失败';
COMMENT ON COLUMN import_batch.fail_reason IS '失败原因';
COMMENT ON COLUMN import_batch.fail_details IS '失败明细';

CREATE INDEX idx_batch_created_by ON import_batch(created_by);
CREATE INDEX idx_batch_created_at ON import_batch(created_at);
CREATE INDEX idx_batch_status ON import_batch(status);

CREATE TABLE student_field_change (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    student_no VARCHAR(32) NOT NULL,
    field_name VARCHAR(64) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    change_reason VARCHAR(256),
    batch_no VARCHAR(64),
    changed_by VARCHAR(64),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_change_student FOREIGN KEY (student_id) REFERENCES student_profile(id) ON DELETE CASCADE
);

COMMENT ON TABLE student_field_change IS '字段变更记录表';
COMMENT ON COLUMN student_field_change.field_name IS '变更字段';
COMMENT ON COLUMN student_field_change.old_value IS '旧值';
COMMENT ON COLUMN student_field_change.new_value IS '新值';
COMMENT ON COLUMN student_field_change.change_reason IS '变更原因';
COMMENT ON COLUMN student_field_change.batch_no IS '关联批次号';
COMMENT ON COLUMN student_field_change.changed_by IS '变更人';
COMMENT ON COLUMN student_field_change.changed_at IS '变更时间';

CREATE INDEX idx_change_student_id ON student_field_change(student_id);
CREATE INDEX idx_change_batch_no ON student_field_change(batch_no);
CREATE INDEX idx_change_field_name ON student_field_change(field_name);
CREATE INDEX idx_change_changed_at ON student_field_change(changed_at);

CREATE TABLE student_academic_score (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    semester VARCHAR(16) NOT NULL,
    course_name VARCHAR(128) NOT NULL,
    score DECIMAL(5,2),
    credit DECIMAL(3,1),
    score_type SMALLINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_score_student FOREIGN KEY (student_id) REFERENCES student_profile(id) ON DELETE CASCADE,
    CONSTRAINT uk_score_student_semester_course UNIQUE (student_id, semester, course_name)
);

COMMENT ON TABLE student_academic_score IS '学生成绩表-预留';
COMMENT ON COLUMN student_academic_score.semester IS '学年学期';
COMMENT ON COLUMN student_academic_score.course_name IS '课程名称';
COMMENT ON COLUMN student_academic_score.score IS '成绩';
COMMENT ON COLUMN student_academic_score.credit IS '学分';
COMMENT ON COLUMN student_academic_score.score_type IS '0-正常，1-补考，2-重修';

CREATE INDEX idx_score_student_id ON student_academic_score(student_id);
CREATE INDEX idx_score_semester ON student_academic_score(semester);

CREATE TABLE student_academic_warning (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    semester VARCHAR(16) NOT NULL,
    warning_type VARCHAR(32) NOT NULL,
    warning_level SMALLINT NOT NULL,
    warning_time TIMESTAMP NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_warning_student FOREIGN KEY (student_id) REFERENCES student_profile(id) ON DELETE CASCADE
);

COMMENT ON TABLE student_academic_warning IS '学业预警表-预留';
COMMENT ON COLUMN student_academic_warning.warning_type IS '预警类型';
COMMENT ON COLUMN student_academic_warning.warning_level IS '1-关注，2-预警，3-严重';
COMMENT ON COLUMN student_academic_warning.warning_time IS '预警时间';
COMMENT ON COLUMN student_academic_warning.description IS '预警描述';

CREATE INDEX idx_warning_student_id ON student_academic_warning(student_id);
CREATE INDEX idx_warning_semester ON student_academic_warning(semester);
CREATE INDEX idx_warning_level ON student_academic_warning(warning_level);

CREATE TABLE student_support_record (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    support_type VARCHAR(32) NOT NULL,
    support_teacher_no VARCHAR(32) NOT NULL,
    support_teacher_name VARCHAR(64),
    support_content TEXT,
    support_date DATE NOT NULL,
    follow_status SMALLINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted SMALLINT DEFAULT 0,
    CONSTRAINT fk_support_student FOREIGN KEY (student_id) REFERENCES student_profile(id) ON DELETE CASCADE
);

COMMENT ON TABLE student_support_record IS '帮扶记录表-预留';
COMMENT ON COLUMN student_support_record.support_type IS 'ACADEMIC-学业，PSYCHOLOGICAL-心理，CAREER-就业';
COMMENT ON COLUMN student_support_record.support_teacher_no IS '帮扶教师工号';
COMMENT ON COLUMN student_support_record.support_teacher_name IS '帮扶教师姓名';
COMMENT ON COLUMN student_support_record.support_content IS '帮扶内容';
COMMENT ON COLUMN student_support_record.support_date IS '帮扶日期';
COMMENT ON COLUMN student_support_record.follow_status IS '0-待跟进，1-跟进中，2-已完成';
COMMENT ON COLUMN student_support_record.deleted IS '逻辑删除标记';

CREATE INDEX idx_support_student_id ON student_support_record(student_id);
CREATE INDEX idx_support_type ON student_support_record(support_type);
CREATE INDEX idx_support_teacher ON student_support_record(support_teacher_no);
CREATE INDEX idx_support_status ON student_support_record(follow_status);
