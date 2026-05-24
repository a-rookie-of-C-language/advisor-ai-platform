CREATE TABLE IF NOT EXISTS teacher_profile (
    id BIGSERIAL PRIMARY KEY,
    teacher_no VARCHAR(32) NOT NULL,
    name VARCHAR(64) NOT NULL,
    college VARCHAR(128),
    department VARCHAR(128),
    title VARCHAR(64),
    phone VARCHAR(32),
    email VARCHAR(128),
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted SMALLINT NOT NULL DEFAULT 0,
    CONSTRAINT uk_teacher_profile_teacher_no UNIQUE (teacher_no)
);

CREATE TABLE IF NOT EXISTS course (
    id BIGSERIAL PRIMARY KEY,
    course_code VARCHAR(64) NOT NULL,
    course_name VARCHAR(128) NOT NULL,
    semester VARCHAR(32) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted SMALLINT NOT NULL DEFAULT 0,
    CONSTRAINT uk_course_code_semester UNIQUE (course_code, semester)
);

CREATE TABLE IF NOT EXISTS teaching_assignment (
    id BIGSERIAL PRIMARY KEY,
    teacher_no VARCHAR(32) NOT NULL,
    course_id BIGINT NOT NULL REFERENCES course(id) ON DELETE CASCADE,
    class_code VARCHAR(64) NOT NULL,
    semester VARCHAR(32) NOT NULL,
    start_date DATE,
    end_date DATE,
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted SMALLINT NOT NULL DEFAULT 0,
    CONSTRAINT uk_teaching_assignment UNIQUE (teacher_no, course_id, class_code, semester)
);

CREATE INDEX IF NOT EXISTS idx_teacher_profile_status ON teacher_profile(status);
CREATE INDEX IF NOT EXISTS idx_course_semester ON course(semester);
CREATE INDEX IF NOT EXISTS idx_teaching_teacher ON teaching_assignment(teacher_no);
CREATE INDEX IF NOT EXISTS idx_teaching_course ON teaching_assignment(course_id);
CREATE INDEX IF NOT EXISTS idx_teaching_class ON teaching_assignment(class_code);
