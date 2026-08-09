-- 为 student_check_in_record 表添加 status 列，用于记录考勤状态（NORMAL/LATE/ABSENT/LEAVE）
ALTER TABLE student_check_in_record
    ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'NORMAL';

-- 将已有记录的 status 根据 checked_in 字段回填
UPDATE student_check_in_record
   SET status = CASE WHEN checked_in THEN 'NORMAL' ELSE 'ABSENT' END
 WHERE status = 'NORMAL' AND checked_in = FALSE;

CREATE INDEX IF NOT EXISTS idx_check_in_record_status
    ON student_check_in_record(status);
