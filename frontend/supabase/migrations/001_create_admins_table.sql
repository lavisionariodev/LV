-- Run this in Supabase Dashboard → SQL Editor.
-- After running: create your first admin in Authentication → Users, then insert that user's id and email here:
--   INSERT INTO public.admins (id, email, first_name, last_name)
--   VALUES ('<user-uuid-from-auth>', 'admin@example.com', 'Admin', 'User');

CREATE TABLE public.admins (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text,
  last_name text,
  role text DEFAULT 'admin',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated users that are in admins"
  ON public.admins FOR SELECT
  USING (auth.uid() = id);
