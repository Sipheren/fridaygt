-- Add sessionType column to LapTime table
-- Q = Qualifying, R = Race

ALTER TABLE "LapTime"
ADD COLUMN "sessionType" TEXT DEFAULT 'R'
CONSTRAINT "LapTime_sessionType_check" CHECK ("sessionType" IN ('Q', 'R'));

-- Add index for faster filtering by session type
CREATE INDEX IF NOT EXISTS "LapTime_sessionType_idx" ON "LapTime"("sessionType");

-- Add comment
COMMENT ON COLUMN "LapTime"."sessionType" IS 'Session type: Q for Qualifying, R for Race (default)';
