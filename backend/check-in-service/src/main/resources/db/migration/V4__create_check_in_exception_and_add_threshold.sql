-- Create check_in_exception table for abnormal attendance records.
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

CREATE INDEX IF NOT EXISTS idx_check_in_exception_student_id ON check_in_exception(student_id);
CREATE INDEX IF NOT EXISTS idx_check_in_exception_check_in_id ON check_in_exception(check_in_id);
CREATE INDEX IF NOT EXISTS idx_check_in_exception_status ON check_in_exception(status);

-- Add late threshold configuration to check_in_activity.
ALTER TABLE check_in_activity
    ADD COLUMN IF NOT EXISTS late_threshold_minutes INTEGER DEFAULT 15;

-- Remove historical records that cannot be linked to an activity.
DELETE FROM student_check_in_record WHERE check_in_id IS NULL;
