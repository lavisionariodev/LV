/**
 * Check if the given user id exists in public.admins.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient
 * @param {string | undefined} userId
 * @returns {Promise<boolean>}
 */
export async function isAdmin(supabaseClient, userId) {
  if (!userId) return false;
  const { data, error } = await supabaseClient
    .from("admins")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}
