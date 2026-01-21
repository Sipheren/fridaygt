-- Make gamertag nullable to allow new users to be created
-- They will set their gamertag during onboarding

-- Drop the unique index first (will recreate after)
DROP INDEX IF EXISTS "idx_user_gamertag_unique";

-- Make gamertag nullable
ALTER TABLE "User"
ALTER COLUMN "gamertag" DROP NOT NULL;

-- Recreate unique index only for non-null values
CREATE UNIQUE INDEX "idx_user_gamertag_unique" ON "User"("gamertag")
WHERE "gamertag" IS NOT NULL;
