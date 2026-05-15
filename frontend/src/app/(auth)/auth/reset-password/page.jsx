"use client";

import { Suspense, useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { validateNewPassword } from "@/lib/validators/authSchemas";
import { useAuthToast } from "@/contexts/ToastContext";
import styles from "./reset-password.module.css";

const VALID_PORTALS = ["buyer", "seller", "administrator"];
const LOGIN_PATHS = {
  buyer: "/buyer/login",
  seller: "/seller/login",
  administrator: "/administrator",
};

/** Reset link is valid for 5 minutes from requested_at in the URL. */
const RESET_LINK_VALID_MS = 5 * 60 * 1000;

/** Read recovery from URL (hash or query). Supabase puts tokens in hash; newer PKCE flows may use ?code=... */
function readRecoveryFromUrl() {
  if (typeof window === "undefined") return false;
  const hash = (window.location.hash || "").toLowerCase();
  const search = (window.location.search || "").toLowerCase();
  const hasTypeRecovery =
    hash.includes("type=recovery") || search.includes("type=recovery");

  // Fallback for code-based flows (e.g. reset links like ?code=...&type=recovery or just ?code=...)
  const hasCodeParam = search.includes("code=");

  return hasTypeRecovery || hasCodeParam;
}

/** Capture recovery at module load so we have it before Supabase or other code can consume the hash. */
const initialHasRecovery =
  typeof window !== "undefined" ? readRecoveryFromUrl() : false;

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useAuthToast();
  const [mounted, setMounted] = useState(false);
  const [recoveryChecked, setRecoveryChecked] = useState(false);
  const [hasRecovery, setHasRecovery] = useState(initialHasRecovery);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Supabase may send a short-lived code in the query (?code=...) for PKCE flows.
  const code = searchParams.get("code");

  const portalParam = searchParams.get("portal") || "buyer";
  const portal = VALID_PORTALS.includes(portalParam) ? portalParam : "buyer";
  const loginPath = LOGIN_PATHS[portal];

  /** If URL has requested_at, link expires after 5 minutes. */
  const requestedAtParam = searchParams.get("requested_at");
  const isLinkExpired =
    requestedAtParam != null &&
    requestedAtParam !== "" &&
    Date.now() - Number(requestedAtParam) > RESET_LINK_VALID_MS;

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const fromUrl = readRecoveryFromUrl();
    setHasRecovery((prev) => prev || fromUrl);
    setMounted(true);
  }, []);

  // Supabase may process the recovery hash and emit PASSWORD_RECOVERY (e.g. when redirect drops the fragment).
  // Newer PKCE flows can also send ?code=..., which must be exchanged for a session first.
  // Listen for PASSWORD_RECOVERY so we know it's safe to show the form; wait a moment before showing "Invalid or Expired".
  useEffect(() => {
    let isMounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setHasRecovery(true);
      }
    });

    // If we have access/refresh tokens in the URL hash, explicitly set session.
    // This prevents "Auth session missing!" when Supabase doesn't automatically consume the fragment.
    (async () => {
      if (typeof window === "undefined") return;
      const rawHash = window.location.hash || "";
      if (!rawHash.startsWith("#")) return;
      const params = new URLSearchParams(rawHash.slice(1));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (!access_token || !refresh_token) return;
      try {
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (error) {
          console.error("Error setting session from recovery hash:", error);
          return;
        }
        // Clean up fragment to avoid leaking tokens via copy/paste screenshots etc.
        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        setHasRecovery(true);
      } catch (err) {
        console.error("Unexpected error setting session from recovery hash:", err);
      }
    })();

    // If we have a code in the query, exchange it for a session so Supabase can emit PASSWORD_RECOVERY.
    (async () => {
      if (!code) return;
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("Error exchanging recovery code for session:", error);
        }
      } catch (err) {
        console.error("Unexpected error exchanging recovery code:", err);
      }
    })();

    const t = setTimeout(() => {
      if (isMounted) {
        setRecoveryChecked(true);
      }
    }, 1500);

    return () => {
      subscription?.unsubscribe();
      clearTimeout(t);
      isMounted = false;
    };
  }, [code]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "password") setPassword(value);
    if (name === "confirmPassword") setConfirmPassword(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateNewPassword(password, confirmPassword);
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      toast.error(
        "Auth session missing. Please open the reset link again (it may have expired) and try resetting your password."
      );
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message || "Password reset failed. Please try again.");
        setSubmitting(false);
        return;
      }
      await supabase.auth.signOut();
      toast.success("Password reset successful! Please log in with your new password.");
      router.replace(loginPath);
    } catch (err) {
      console.error("Reset password error:", err);
      toast.error("An error occurred. Please try again later.");
      setSubmitting(false);
    }
  };

  if (!mounted || (!hasRecovery && !recoveryChecked)) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <p className={styles.message}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasRecovery || isLinkExpired) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.iconContainer}>
            <i className="bx bx-link-alt" aria-hidden />
          </div>
          <h1 className={styles.title}>Invalid or Expired Link</h1>
          <p className={styles.message}>
            {isLinkExpired
              ? "This password reset link has expired (valid for 5 minutes). Please request a new one from the login page."
              : "This password reset link is invalid or has expired. Please request a new one from the login page."}
          </p>
          <Link href={loginPath} className={styles.primaryButton}>
            Back to Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.iconContainer}>
          <i className="bx bx-lock-alt" aria-hidden />
        </div>
        <h1 className={styles.title}>Reset Password</h1>
        <p className={styles.message}>
          Enter your new password below. Use at least 8 characters with
          lowercase, uppercase, and digits.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="password"
            name="password"
            placeholder="New Password"
            value={password}
            onChange={handleChange}
            className={styles.input}
            autoComplete="new-password"
            disabled={submitting}
          />
          <div className={styles.passwordRequirements}>
            • At least 8 characters
            <br />
            • Lowercase, uppercase, and digits
          </div>

          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={handleChange}
            className={styles.input}
            autoComplete="new-password"
            disabled={submitting}
          />

          <button
            type="submit"
            className={styles.primaryButton}
            disabled={submitting}
          >
            {submitting ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
