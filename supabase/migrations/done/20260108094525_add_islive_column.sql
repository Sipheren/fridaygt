-- Add isLive column to RunList table
ALTER TABLE "RunList" ADD COLUMN IF NOT EXISTS "isLive" BOOLEAN DEFAULT false;

-- Create index for faster queries on live run lists
CREATE INDEX IF NOT EXISTS "RunList_isLive_idx" ON "RunList"("isLive") WHERE "isLive" = true;
