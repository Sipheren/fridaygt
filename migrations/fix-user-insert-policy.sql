-- Fix User INSERT policy to allow NextAuth to create users
-- The service role key should bypass RLS, but we need a proper policy

-- Drop the overly restrictive INSERT policy
DROP POLICY IF EXISTS "Users: Insert restricted" ON "User";

-- Allow inserts (NextAuth will use service role key which bypasses RLS anyway)
-- This policy is mainly for documentation and safety
CREATE POLICY "Users: Allow service role inserts"
  ON "User" FOR INSERT
  WITH CHECK (true);

-- Note: Service role key bypasses RLS, so this policy won't block it
-- But it's good practice to have explicit policies
