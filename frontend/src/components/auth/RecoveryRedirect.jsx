"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";

/**
 * If the user landed on any page with a password-recovery hash (from the email link),
 * redirect them to the reset-password page so they can set a new password.
 * Uses window.location.replace so the hash (tokens) is preserved; Next.js router can drop it.
 */
export default function RecoveryRedirect() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const hash = (window.location.hash || "").toLowerCase();
    const rawSearch = window.location.search || "";
    const search = rawSearch.toLowerCase();

    // Supabase can signal recovery either via type=recovery in the hash/query
    // or via a short-lived ?code=... parameter (PKCE flow).
    const hasRecovery =
      hash.includes("type=recovery") ||
      search.includes("type=recovery") ||
      search.includes("code=");

    if (!hasRecovery) return;
    if (pathname === "/auth/reset-password") return;

    // Infer portal from current path so admin/seller/buyer get the right login after reset
    let portal = "buyer";
    if (pathname.startsWith("/administrator")) portal = "administrator";
    else if (pathname.startsWith("/seller")) portal = "seller";
    else if (pathname.startsWith("/buyer")) portal = "buyer";

    // Preserve existing query params (e.g. code=..., type=recovery) and just
    // ensure portal is set correctly for the reset page.
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    params.set("portal", portal);
    const searchString = params.toString();

    const path = `/auth/reset-password${searchString ? `?${searchString}` : ""}`;
    window.location.replace(`${window.location.origin}${path}${hash}`);
  }, [pathname]);

  return null;
}
