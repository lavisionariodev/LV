import { supabase } from "@/lib/supabase/client";
import { getSession } from "./session";
import { isAdmin } from "./admin";

/**
 * Require authenticated user. Returns { user, error }.
 */
export async function requireAuth() {
  const { data, error } = await getSession();
  const user = data?.session?.user ?? null;
  if (error || !user) {
    return { user: null, error: error?.message ?? "Not signed in" };
  }
  return { user, error: null };
}

/**
 * Require authenticated admin (user must be in public.admins).
 * Returns { user, isAdmin, error }.
 */
export async function requireAdmin() {
  const { data, error } = await getSession();
  const user = data?.session?.user ?? null;
  if (error || !user) {
    return {
      user: null,
      isAdmin: false,
      error: error?.message ?? "Not signed in",
    };
  }
  const admin = await isAdmin(supabase, user.id);
  return {
    user,
    isAdmin: admin,
    error: admin ? null : "Not an admin",
  };
}
