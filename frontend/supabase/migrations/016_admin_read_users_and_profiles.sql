-- Allow admins to read all users and profiles (admin portal).
-- Without this, RLS restricts SELECT to "own row" only (see 004_create_users_table.sql and 003_create_profiles_table.sql).

-- Users
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
CREATE POLICY "Admins can read all users"
  ON public.users
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- Profiles (needed to display full_name/avatar_url in admin users page)
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles"
  ON public.profiles
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

