-- Create sync trigger to automatically create public.User records
-- when NextAuth creates users in next_auth.users table

-- Function to sync next_auth.users → public.User
CREATE OR REPLACE FUNCTION public.sync_next_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "public"."User" (
    id,
    email,
    name,
    role,
    gamertag,
    "createdAt",
    "updatedAt"
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.name,
    'USER',           -- Default role for new users
    NULL,             -- Gamertag to be set later by user
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Don't overwrite if already exists

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to fire after INSERT on next_auth.users
DROP TRIGGER IF EXISTS on_next_auth_user_created ON "next_auth"."users";

CREATE TRIGGER on_next_auth_user_created
AFTER INSERT ON "next_auth"."users"
FOR EACH ROW
EXECUTE FUNCTION public.sync_next_auth_user();

-- Add comment for documentation
COMMENT ON FUNCTION public.sync_next_auth_user() IS
'Automatically creates a public.User record when NextAuth creates a user in next_auth.users.
This ensures the two schemas stay synchronized for authentication.';
