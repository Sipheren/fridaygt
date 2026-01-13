-- Add gamertag column to User table
-- Gamertag is publicly visible for leaderboards, while name/email are private

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "gamertag" TEXT;

-- Make gamertag unique (no duplicate gamertags)
CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_gamertag_unique" ON "User"("gamertag");

-- For existing users, set gamertag to first part of email as placeholder
-- You can update these manually in the dashboard after running this
UPDATE "User"
SET "gamertag" = SPLIT_PART(email, '@', 1)
WHERE "gamertag" IS NULL;

-- Make gamertag NOT NULL after setting defaults
ALTER TABLE "User"
ALTER COLUMN "gamertag" SET NOT NULL;
