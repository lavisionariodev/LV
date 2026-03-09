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
    const search = (window.location.search || "").toLowerCase();

    const hasRecovery =
      hash.includes("type=recovery") || search.includes("type=recovery");

    if (!hasRecovery) return;
    if (pathname === "/auth/reset-password") return;

    // Infer portal from current path so admin/seller/buyer get the right login after reset
    let portal = "buyer";
    if (pathname.startsWith("/administrator")) portal = "administrator";
    else if (pathname.startsWith("/seller")) portal = "seller";
    else if (pathname.startsWith("/buyer")) portal = "buyer";

    const path = `/auth/reset-password?portal=${portal}`;
    window.location.replace(`${window.location.origin}${path}${hash}`);
  }, [pathname]);

  return null;
}
