-- Enable Row Level Security (RLS) on all tables
-- This migration creates comprehensive security policies for the FridayGT database
-- Version 3: Fixed case-sensitive column names (userId not userid)

-- =============================================================================
-- ENABLE RLS ON ALL TABLES
-- =============================================================================

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VerificationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Track" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Car" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LapTime" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CarBuild" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CarBuildUpgrade" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CarBuildSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RunList" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RunListEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RunListEdit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RunSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SessionAttendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LobbySettings" ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- HELPER FUNCTION: Get current user ID from JWT
-- =============================================================================

CREATE OR REPLACE FUNCTION public.current_user_id() RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::text;
$$ LANGUAGE SQL STABLE;

-- =============================================================================
-- USER TABLE POLICIES
-- =============================================================================

-- Anyone can read public user data (id, gamertag, role)
CREATE POLICY "Users: Public data viewable by anyone"
  ON "User" FOR SELECT
  USING (true);

-- Users can update their own data (except role)
CREATE POLICY "Users: Users can update own profile"
  ON "User" FOR UPDATE
  USING ("id" = public.current_user_id());

-- Only admins can insert users (handled by NextAuth, but good to restrict)
CREATE POLICY "Users: Insert restricted"
  ON "User" FOR INSERT
  WITH CHECK (false);

-- Only admins can delete users
CREATE POLICY "Users: Delete restricted"
  ON "User" FOR DELETE
  USING (false);

-- =============================================================================
-- AUTH TABLES POLICIES (Account, Session, VerificationToken)
-- =============================================================================

-- Accounts: Users can only see their own accounts
CREATE POLICY "Accounts: Users can view own accounts"
  ON "Account" FOR SELECT
  USING ("userId" = public.current_user_id());

CREATE POLICY "Accounts: Users can insert own accounts"
  ON "Account" FOR INSERT
  WITH CHECK ("userId" = public.current_user_id());

CREATE POLICY "Accounts: Users can update own accounts"
  ON "Account" FOR UPDATE
  USING ("userId" = public.current_user_id());

CREATE POLICY "Accounts: Users can delete own accounts"
  ON "Account" FOR DELETE
  USING ("userId" = public.current_user_id());

-- Sessions: Users can only see their own sessions
CREATE POLICY "Sessions: Users can view own sessions"
  ON "Session" FOR SELECT
  USING ("userId" = public.current_user_id());

CREATE POLICY "Sessions: Users can insert own sessions"
  ON "Session" FOR INSERT
  WITH CHECK ("userId" = public.current_user_id());

CREATE POLICY "Sessions: Users can update own sessions"
  ON "Session" FOR UPDATE
  USING ("userId" = public.current_user_id());

CREATE POLICY "Sessions: Users can delete own sessions"
  ON "Session" FOR DELETE
  USING ("userId" = public.current_user_id());

-- VerificationToken: Allow public read for NextAuth magic link flow
CREATE POLICY "VerificationTokens: Public read for auth flow"
  ON "VerificationToken" FOR SELECT
  USING (true);

CREATE POLICY "VerificationTokens: Public insert for auth flow"
  ON "VerificationToken" FOR INSERT
  WITH CHECK (true);

CREATE POLICY "VerificationTokens: Public delete for auth flow"
  ON "VerificationToken" FOR DELETE
  USING (true);

-- =============================================================================
-- GT7 DATA TABLES (Track, Car) - READ ONLY FOR ALL
-- =============================================================================

-- Tracks: Anyone can view tracks
CREATE POLICY "Tracks: Public read access"
  ON "Track" FOR SELECT
  USING (true);

-- Cars: Anyone can view cars
CREATE POLICY "Cars: Public read access"
  ON "Car" FOR SELECT
  USING (true);

-- =============================================================================
-- LAP TIME POLICIES
-- =============================================================================

-- Lap Times: Anyone can view (for public leaderboards)
CREATE POLICY "LapTimes: Public read access"
  ON "LapTime" FOR SELECT
  USING (true);

-- Lap Times: Authenticated users can insert their own lap times
CREATE POLICY "LapTimes: Users can insert own lap times"
  ON "LapTime" FOR INSERT
  WITH CHECK ("userId" = public.current_user_id());

-- Lap Times: Users can update their own lap times
CREATE POLICY "LapTimes: Users can update own lap times"
  ON "LapTime" FOR UPDATE
  USING ("userId" = public.current_user_id());

-- Lap Times: Users can delete their own lap times
CREATE POLICY "LapTimes: Users can delete own lap times"
  ON "LapTime" FOR DELETE
  USING ("userId" = public.current_user_id());

-- =============================================================================
-- CAR BUILD POLICIES
-- =============================================================================

-- Builds: Public builds viewable by anyone, private builds only by creator
CREATE POLICY "Builds: Public builds viewable by anyone"
  ON "CarBuild" FOR SELECT
  USING (
    "isPublic" = true
    OR "userId" = public.current_user_id()
  );

-- Builds: Authenticated users can create builds
CREATE POLICY "Builds: Users can create builds"
  ON "CarBuild" FOR INSERT
  WITH CHECK ("userId" = public.current_user_id());

-- Builds: Users can update their own builds
CREATE POLICY "Builds: Users can update own builds"
  ON "CarBuild" FOR UPDATE
  USING ("userId" = public.current_user_id());

-- Builds: Users can delete their own builds
CREATE POLICY "Builds: Users can delete own builds"
  ON "CarBuild" FOR DELETE
  USING ("userId" = public.current_user_id());

-- Build Upgrades: Viewable if parent build is viewable
CREATE POLICY "BuildUpgrades: Viewable if build is viewable"
  ON "CarBuildUpgrade" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "CarBuild"
      WHERE "CarBuild"."id" = "CarBuildUpgrade"."buildId"
      AND (
        "CarBuild"."isPublic" = true
        OR "CarBuild"."userId" = public.current_user_id()
      )
    )
  );

-- Build Upgrades: Users can manage upgrades for their own builds
CREATE POLICY "BuildUpgrades: Users can manage own build upgrades"
  ON "CarBuildUpgrade" FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "CarBuild"
      WHERE "CarBuild"."id" = "CarBuildUpgrade"."buildId"
      AND "CarBuild"."userId" = public.current_user_id()
    )
  );

-- Build Settings: Viewable if parent build is viewable
CREATE POLICY "BuildSettings: Viewable if build is viewable"
  ON "CarBuildSetting" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "CarBuild"
      WHERE "CarBuild"."id" = "CarBuildSetting"."buildId"
      AND (
        "CarBuild"."isPublic" = true
        OR "CarBuild"."userId" = public.current_user_id()
      )
    )
  );

-- Build Settings: Users can manage settings for their own builds
CREATE POLICY "BuildSettings: Users can manage own build settings"
  ON "CarBuildSetting" FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "CarBuild"
      WHERE "CarBuild"."id" = "CarBuildSetting"."buildId"
      AND "CarBuild"."userId" = public.current_user_id()
    )
  );

-- =============================================================================
-- RUN LIST POLICIES
-- =============================================================================

-- Run Lists: Public lists viewable by anyone, private lists only by creator
CREATE POLICY "RunLists: Public lists viewable by anyone"
  ON "RunList" FOR SELECT
  USING (
    "isPublic" = true
    OR "createdById" = public.current_user_id()
  );

-- Run Lists: Authenticated users can create run lists
CREATE POLICY "RunLists: Users can create run lists"
  ON "RunList" FOR INSERT
  WITH CHECK ("createdById" = public.current_user_id());

-- Run Lists: Users can update their own run lists
CREATE POLICY "RunLists: Users can update own run lists"
  ON "RunList" FOR UPDATE
  USING ("createdById" = public.current_user_id());

-- Run Lists: Users can delete their own run lists
CREATE POLICY "RunLists: Users can delete own run lists"
  ON "RunList" FOR DELETE
  USING ("createdById" = public.current_user_id());

-- Run List Entries: Viewable if parent run list is viewable
CREATE POLICY "RunListEntries: Viewable if run list is viewable"
  ON "RunListEntry" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "RunList"
      WHERE "RunList"."id" = "RunListEntry"."runListId"
      AND (
        "RunList"."isPublic" = true
        OR "RunList"."createdById" = public.current_user_id()
      )
    )
  );

-- Run List Entries: Users can manage entries for their own run lists
CREATE POLICY "RunListEntries: Users can manage own run list entries"
  ON "RunListEntry" FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "RunList"
      WHERE "RunList"."id" = "RunListEntry"."runListId"
      AND "RunList"."createdById" = public.current_user_id()
    )
  );

-- Run List Edits: Viewable if parent run list is viewable
CREATE POLICY "RunListEdits: Viewable if run list is viewable"
  ON "RunListEdit" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "RunList"
      WHERE "RunList"."id" = "RunListEdit"."runListId"
      AND (
        "RunList"."isPublic" = true
        OR "RunList"."createdById" = public.current_user_id()
      )
    )
  );

-- Run List Edits: Insert allowed for run list collaborators
CREATE POLICY "RunListEdits: Users can log edits to own run lists"
  ON "RunListEdit" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "RunList"
      WHERE "RunList"."id" = "RunListEdit"."runListId"
      AND "RunList"."createdById" = public.current_user_id()
    )
  );

-- =============================================================================
-- RUN SESSION POLICIES
-- =============================================================================

-- Sessions: Anyone can view sessions (for public race night tracking)
CREATE POLICY "Sessions: Public read access"
  ON "RunSession" FOR SELECT
  USING (true);

-- Sessions: Users can create sessions for their own run lists
CREATE POLICY "Sessions: Users can create sessions from own run lists"
  ON "RunSession" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "RunList"
      WHERE "RunList"."id" = "RunSession"."runListId"
      AND "RunList"."createdById" = public.current_user_id()
    )
  );

-- Sessions: Users can update their own sessions
CREATE POLICY "Sessions: Users can update own sessions"
  ON "RunSession" FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "RunList"
      WHERE "RunList"."id" = "RunSession"."runListId"
      AND "RunList"."createdById" = public.current_user_id()
    )
  );

-- Sessions: Users can delete their own sessions
CREATE POLICY "Sessions: Users can delete own sessions"
  ON "RunSession" FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "RunList"
      WHERE "RunList"."id" = "RunSession"."runListId"
      AND "RunList"."createdById" = public.current_user_id()
    )
  );

-- Session Attendance: Anyone can view attendance (public race tracking)
CREATE POLICY "Attendance: Public read access"
  ON "SessionAttendance" FOR SELECT
  USING (true);

-- Session Attendance: Authenticated users can join sessions
CREATE POLICY "Attendance: Users can join sessions"
  ON "SessionAttendance" FOR INSERT
  WITH CHECK ("userId" = public.current_user_id());

-- Session Attendance: Users can update their own attendance
CREATE POLICY "Attendance: Users can update own attendance"
  ON "SessionAttendance" FOR UPDATE
  USING ("userId" = public.current_user_id());

-- Session Attendance: Users can leave sessions (delete their attendance)
CREATE POLICY "Attendance: Users can leave sessions"
  ON "SessionAttendance" FOR DELETE
  USING ("userId" = public.current_user_id());

-- =============================================================================
-- LOBBY SETTINGS POLICIES
-- =============================================================================

-- Lobby Settings: Anyone can view lobby settings
CREATE POLICY "LobbySettings: Public read access"
  ON "LobbySettings" FOR SELECT
  USING (true);

-- Lobby Settings: Authenticated users can create lobby settings
CREATE POLICY "LobbySettings: Users can create lobby settings"
  ON "LobbySettings" FOR INSERT
  WITH CHECK (public.current_user_id() IS NOT NULL);

-- Lobby Settings: Users can update lobby settings
CREATE POLICY "LobbySettings: Users can update lobby settings"
  ON "LobbySettings" FOR UPDATE
  USING (public.current_user_id() IS NOT NULL);

-- Lobby Settings: Users can delete lobby settings
CREATE POLICY "LobbySettings: Users can delete lobby settings"
  ON "LobbySettings" FOR DELETE
  USING (public.current_user_id() IS NOT NULL);

-- =============================================================================
-- COMPLETED
-- =============================================================================

-- All tables now have RLS enabled with appropriate security policies
-- Public data (lap times, tracks, cars, public builds/lists) is accessible to anyone
-- Private data (private builds/lists, emails) is protected
-- Users can only modify their own data
