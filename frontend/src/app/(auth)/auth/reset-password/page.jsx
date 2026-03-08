"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { validateNewPassword } from "@/lib/validators/authSchemas";
import { useToast } from "@/contexts/ToastContext";
import styles from "./reset-password.module.css";

const VALID_PORTALS = ["buyer", "seller", "administrator"];
const LOGIN_PATHS = {
  buyer: "/buyer/login",
  seller: "/seller/login",
  administrator: "/administrator",
};

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [mounted, setMounted] = useState(false);
  const [hasRecovery, setHasRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const portalParam = searchParams.get("portal") || "buyer";
  const portal = VALID_PORTALS.includes(portalParam) ? portalParam : "buyer";
  const loginPath = LOGIN_PATHS[portal];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash || "";
    setHasRecovery(hash.includes("type=recovery"));
    setMounted(true);
  }, []);

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

  if (!mounted) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <p className={styles.message}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!hasRecovery) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.iconContainer}>
            <i className="bx bx-link-alt" aria-hidden />
          </div>
          <h1 className={styles.title}>Invalid or Expired Link</h1>
          <p className={styles.message}>
            This password reset link is invalid or has expired. Please request a
            new one from the login page.
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
