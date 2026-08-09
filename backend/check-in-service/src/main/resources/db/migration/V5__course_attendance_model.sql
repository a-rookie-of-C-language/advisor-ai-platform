CREATE TABLE IF NOT EXISTS course_schedule (
    id BIGSERIAL PRIMARY KEY,
    term VARCHAR(32) NOT NULL,
    class_code VARCHAR(64) NOT NULL,
    course_code VARCHAR(64) NOT NULL,
    course_name VARCHAR(128) NOT NULL,
    teacher_no VARCHAR(32),
    teacher_name VARCHAR(64),
    week_start INTEGER NOT NULL,
    week_end INTEGER NOT NULL,
    weekday INTEGER NOT NULL,
    period_start INTEGER NOT NULL,
    period_end INTEGER NOT NULL,
    location VARCHAR(128),
    created_by BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_course_schedule_term_class
    ON course_schedule(term, class_code);

CREATE TABLE IF NOT EXISTS class_session (
    id BIGSERIAL PRIMARY KEY,
    schedule_id BIGINT NOT NULL,
    term VARCHAR(32) NOT NULL,
    class_code VARCHAR(64) NOT NULL,
    course_code VARCHAR(64) NOT NULL,
    course_name VARCHAR(128) NOT NULL,
    teacher_no VARCHAR(32),
    teacher_name VARCHAR(64),
    week_no INTEGER NOT NULL,
    weekday INTEGER NOT NULL,
    period_start INTEGER NOT NULL,
    period_end INTEGER NOT NULL,
    session_date DATE,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    location VARCHAR(128),
    status VARCHAR(16) NOT NULL DEFAULT 'SCHEDULED',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_class_session_schedule_week UNIQUE(schedule_id, week_no)
);

CREATE INDEX IF NOT EXISTS idx_class_session_term_class
    ON class_session(term, class_code, week_no);

CREATE TABLE IF NOT EXISTS session_attendance (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL,
    student_id BIGINT NOT NULL,
    student_no VARCHAR(32) NOT NULL,
    student_name VARCHAR(64) NOT NULL,
    class_code VARCHAR(64) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'PRESENT',
    remark VARCHAR(256),
    recorded_by BIGINT,
    recorded_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_session_attendance_student UNIQUE(session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_session_attendance_session
    ON session_attendance(session_id);

CREATE INDEX IF NOT EXISTS idx_session_attendance_student
    ON session_attendance(student_id);

CREATE TABLE IF NOT EXISTS attendance_work_order (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL,
    class_code VARCHAR(64) NOT NULL,
    type VARCHAR(32) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    reason VARCHAR(512) NOT NULL,
    target_session_date DATE,
    target_start_time TIMESTAMP,
    target_end_time TIMESTAMP,
    target_location VARCHAR(128),
    applicant_id BIGINT NOT NULL,
    reviewer_id BIGINT,
    review_note VARCHAR(512),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attendance_work_order_status
    ON attendance_work_order(status);

CREATE INDEX IF NOT EXISTS idx_attendance_work_order_class
    ON attendance_work_order(class_code);
