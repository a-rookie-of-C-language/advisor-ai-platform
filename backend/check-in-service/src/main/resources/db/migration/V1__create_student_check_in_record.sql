CREATE TABLE IF NOT EXISTS student_check_in_record (
                                                     id BIGSERIAL PRIMARY KEY,
                                                     student_id BIGINT NOT NULL,
                                                     check_date DATE NOT NULL,
                                                     checked_in BOOLEAN NOT NULL DEFAULT FALSE,
                                                     check_time TIMESTAMP,
                                                     created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT uk_student_check_in_record_student_date UNIQUE (student_id, check_date)
  );

CREATE INDEX IF NOT EXISTS idx_student_check_in_record_student_date
  ON student_check_in_record (student_id, check_date);
