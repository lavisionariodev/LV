import { supabase } from '@/lib/supabase/client';

export async function getUserRole(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data.role;
}

