-- 创建 check_in_exception 表，用于记录打卡异常（缺勤、迟到、早退等）
CREATE TABLE IF NOT EXISTS check_in_exception (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    check_in_id VARCHAR(36) NOT NULL,
    exception_type VARCHAR(16) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    handler_id BIGINT,
    handler_note TEXT,
    handled_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_check_in_exception_student_id ON check_in_exception(student_id);
CREATE INDEX IF NOT EXISTS idx_check_in_exception_check_in_id ON check_in_exception(check_in_id);
CREATE INDEX IF NOT EXISTS idx_check_in_exception_status ON check_in_exception(status);

-- 为 check_in_activity 表添加 late_threshold_minutes 列，用于自定义迟到阈值
ALTER TABLE check_in_activity
    ADD COLUMN IF NOT EXISTS late_threshold_minutes INTEGER DEFAULT 15;

-- 清理 check_in_id 为 NULL 的历史数据（这些记录无法关联到活动，无实际意义）
DELETE FROM student_check_in_record WHERE check_in_id IS NULL;
