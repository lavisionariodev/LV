import { supabase } from "@/lib/supabase/client";

/**
 * Get current session. Returns { data, error } from Supabase.
 */
export async function getSession() {
  return supabase.auth.getSession();
}

/**
 * Get current user. Returns user object or null.
 */
export async function getUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) return null;
  return user;
}

/**
 * Subscribe to auth state changes (sign in, sign out, token refresh).
 * Call the returned function to unsubscribe.
 */
export function onAuthStateChange(callback) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  return supabase.auth.signOut();
}
