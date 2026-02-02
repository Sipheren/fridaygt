-- Version: 0.21.0
-- Description: Create notes table for sticky notes board
-- Date: 2026-02-02

-- Drop table if it exists (in case of partial creation from previous run)
DROP TABLE IF EXISTS "Note" CASCADE;

-- Create Note table
CREATE TABLE "Note" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL DEFAULT '',
  "content" TEXT DEFAULT '',
  "color" VARCHAR(7) DEFAULT '#fef08a',
  "positionX" INT DEFAULT 0,
  "positionY" INT DEFAULT 0,
  "width" VARCHAR(20) DEFAULT 'medium',
  "pinned" BOOLEAN DEFAULT false,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdBy" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_notes_created_by ON "Note"("createdBy");
CREATE INDEX idx_notes_pinned ON "Note"("pinned") WHERE "pinned" = true;
CREATE INDEX idx_notes_created_at ON "Note"("createdAt" DESC);

-- Enable Row Level Security
ALTER TABLE "Note" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public read (everyone can view notes)
CREATE POLICY "notes_select_all"
  ON "Note"
  FOR SELECT
  USING (true);

-- RLS Policy: Authenticated users can create notes
CREATE POLICY "notes_insert_authenticated"
  ON "Note"
  FOR INSERT
  WITH CHECK (public.current_user_id() IS NOT NULL);

-- RLS Policy: Users can update their own notes OR admins can update any
CREATE POLICY "notes_update_own_or_admin"
  ON "Note"
  FOR UPDATE
  USING (
    "createdBy" = public.current_user_id() OR
    public.current_user_id() IN (
      SELECT "id" FROM "User" WHERE "role" = 'ADMIN'
    )
  );

-- RLS Policy: Users can delete their own notes OR admins can delete any
CREATE POLICY "notes_delete_own_or_admin"
  ON "Note"
  FOR DELETE
  USING (
    "createdBy" = public.current_user_id() OR
    public.current_user_id() IN (
      SELECT "id" FROM "User" WHERE "role" = 'ADMIN'
    )
  );

-- Add comment
COMMENT ON TABLE "Note" IS 'Collaborative sticky notes board for team members';
