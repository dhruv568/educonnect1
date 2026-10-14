-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "teacher_profiles_verificationStatus_idx" ON "teacher_profiles"("verificationStatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "courses_status_idx" ON "courses"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "courses_teacherId_status_idx" ON "courses"("teacherId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "courses_category_idx" ON "courses"("category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "enrollments_studentId_status_idx" ON "enrollments"("studentId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "enrollments_courseId_status_idx" ON "enrollments"("courseId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "lesson_progresses_enrollmentId_completed_idx" ON "lesson_progresses"("enrollmentId", "completed");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "live_class_slots_status_idx" ON "live_class_slots"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "live_class_slots_teacherId_status_idx" ON "live_class_slots"("teacherId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "live_class_slots_startTime_endTime_idx" ON "live_class_slots"("startTime", "endTime");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bookings_studentId_status_idx" ON "bookings"("studentId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bookings_liveClassSlotId_status_idx" ON "bookings"("liveClassSlotId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "class_attendances_sessionId_status_idx" ON "class_attendances"("sessionId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "class_attendances_studentId_idx" ON "class_attendances"("studentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "financial_ledger_entries_type_status_idx" ON "financial_ledger_entries"("type", "status");

-- CreateIndex: Unique constraint on (sessionId, studentId)
-- NOTE: Prior to applying this unique index to a production database with existing historical data,
-- verify that no duplicate (sessionId, studentId) records exist. If duplicates are present,
-- execute the pre-migration deduplication plan documented in the migration review.
CREATE UNIQUE INDEX IF NOT EXISTS "class_attendances_sessionId_studentId_key" ON "class_attendances"("sessionId", "studentId");
