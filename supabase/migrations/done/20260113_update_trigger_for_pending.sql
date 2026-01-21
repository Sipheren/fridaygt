-- Update trigger to set PENDING role for new users (approval system)

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_next_auth_user_created ON "next_auth"."users";
DROP FUNCTION IF EXISTS public.sync_next_auth_user();

-- Recreate function with PENDING role
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
    'PENDING',       -- New users require admin approval
    NULL,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_next_auth_user_created
AFTER INSERT ON "next_auth"."users"
FOR EACH ROW
EXECUTE FUNCTION public.sync_next_auth_user();

-- Update comment
COMMENT ON FUNCTION public.sync_next_auth_user() IS
'Creates a public.User record with PENDING role when NextAuth creates a user.
New users require admin approval before they can access the system.';
