-- Add isActive column to RunList table
ALTER TABLE "RunList" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT false;

-- Create index for faster queries on active run lists
CREATE INDEX IF NOT EXISTS "RunList_isActive_idx" ON "RunList"("isActive") WHERE "isActive" = true;

-- Add isLive column to RunList table (controls "LIVE" badge in Tonight nav)
ALTER TABLE "RunList" ADD COLUMN IF NOT EXISTS "isLive" BOOLEAN DEFAULT false;

-- Create index for faster queries on live run lists
CREATE INDEX IF NOT EXISTS "RunList_isLive_idx" ON "RunList"("isLive") WHERE "isLive" = true;

-- Add constraint to ensure only one run list per user can be active
-- (We'll handle this in application logic instead since Supabase doesn't support partial unique constraints easily)
