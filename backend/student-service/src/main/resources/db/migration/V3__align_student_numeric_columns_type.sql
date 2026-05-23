-- student-service schema patch: align remaining SMALLINT columns with JPA Integer fields
ALTER TABLE student_profile ALTER COLUMN gender TYPE INT USING gender::INT;
ALTER TABLE student_profile ALTER COLUMN info_completeness TYPE INT USING info_completeness::INT;
ALTER TABLE student_profile ALTER COLUMN risk_level TYPE INT USING risk_level::INT;
ALTER TABLE student_profile ALTER COLUMN deleted TYPE INT USING deleted::INT;

ALTER TABLE student_task ALTER COLUMN task_status TYPE INT USING task_status::INT;

ALTER TABLE student_academic_score ALTER COLUMN score_type TYPE INT USING score_type::INT;

ALTER TABLE student_academic_warning ALTER COLUMN warning_level TYPE INT USING warning_level::INT;

ALTER TABLE student_support_record ALTER COLUMN follow_status TYPE INT USING follow_status::INT;
ALTER TABLE student_support_record ALTER COLUMN deleted TYPE INT USING deleted::INT;
