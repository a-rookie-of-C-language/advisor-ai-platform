-- student-service schema patch: align import_batch.status with JPA Integer
ALTER TABLE import_batch ALTER COLUMN status TYPE INT USING status::INT;
