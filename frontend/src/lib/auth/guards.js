import { supabase } from "@/lib/supabase/client";
import { getSession } from "./session";
import { isAdmin } from "./admin";
import { getUserRole, ROLE_SELLER } from "./roles";
import { getSellerStatusForUser } from "@/lib/sellers/client";

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

/**
 * Require authenticated seller (users.role === 'seller').
 * Returns { user, isSeller, sellerStatus, error }.
 */
export async function requireSeller() {
  const { data, error } = await getSession();
  const user = data?.session?.user ?? null;
  if (error || !user) {
    return {
      user: null,
      isSeller: false,
      sellerStatus: null,
      error: error?.message ?? "Not signed in",
    };
  }

  const role = await getUserRole(user.id);
  if (role !== ROLE_SELLER) {
    return {
      user,
      isSeller: false,
      sellerStatus: null,
      error: "Not a seller",
    };
  }

  const sellerStatus = await getSellerStatusForUser(user.id);

  if (sellerStatus === "suspended") {
    return {
      user,
      isSeller: false,
      sellerStatus,
      error: "Seller account is suspended",
    };
  }

  return {
    user,
    isSeller: true,
    sellerStatus,
    error: null,
  };
}

