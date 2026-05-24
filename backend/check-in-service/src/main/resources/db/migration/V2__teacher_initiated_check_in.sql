CREATE TABLE IF NOT EXISTS check_in_activity (
    id BIGSERIAL PRIMARY KEY,
    check_in_id VARCHAR(36) NOT NULL,
    course_id BIGINT NOT NULL,
    course_name VARCHAR(128),
    title VARCHAR(128) NOT NULL,
    teacher_user_id BIGINT NOT NULL,
    teacher_no VARCHAR(32) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_check_in_activity_check_in_id UNIQUE (check_in_id)
);

CREATE TABLE IF NOT EXISTS check_in_activity_class (
    id BIGSERIAL PRIMARY KEY,
    check_in_id VARCHAR(36) NOT NULL,
    class_code VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_check_in_activity_class UNIQUE (check_in_id, class_code)
);

ALTER TABLE student_check_in_record
    ADD COLUMN IF NOT EXISTS check_in_id VARCHAR(36);

ALTER TABLE student_check_in_record
    ADD COLUMN IF NOT EXISTS class_code VARCHAR(64);

ALTER TABLE student_check_in_record
    DROP CONSTRAINT IF EXISTS uk_student_check_in_record_student_date;

CREATE UNIQUE INDEX IF NOT EXISTS uk_student_check_in_record_activity_student
    ON student_check_in_record(check_in_id, student_id)
    WHERE check_in_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_check_in_activity_teacher ON check_in_activity(teacher_user_id);
CREATE INDEX IF NOT EXISTS idx_check_in_activity_window ON check_in_activity(start_time, end_time, status);
CREATE INDEX IF NOT EXISTS idx_check_in_activity_class_code ON check_in_activity_class(class_code);
