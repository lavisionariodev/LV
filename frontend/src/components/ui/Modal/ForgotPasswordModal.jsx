"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import styles from "./ForgotPasswordModal.module.css";

const VALID_PORTALS = ["buyer", "seller", "administrator"];

export default function ForgotPasswordModal({
  isOpen,
  onClose,
  portal = "buyer",
  onError,
  onSuccess,
}) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const safePortal = VALID_PORTALS.includes(portal) ? portal : "buyer";

  const handleSubmit = async () => {
    if (!email?.trim()) {
      onError?.("Please enter your email address.");
      return;
    }
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const redirectTo = `${origin}/auth/reset-password?portal=${safePortal}`;
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo }
      );
      if (error) {
        onError?.(
          error.message || "Failed to send reset email. Please try again."
        );
        return;
      }
      setSubmitted(true);
      onSuccess?.();
    } catch (err) {
      console.error("Forgot password error:", err);
      onError?.("An error occurred. Please try again later.");
    }
  };

  const handleClose = () => {
    setEmail("");
    setSubmitted(false);
    onClose();
  };

  const handleTryAgain = () => {
    setSubmitted(false);
    setEmail("");
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        {!submitted ? (
          <>
            <button
              type="button"
              className={styles.closeButton}
              onClick={handleClose}
              aria-label="Close"
            >
              ×
            </button>
            <div className={styles.iconContainer}>
              <i className="bx bx-envelope" aria-hidden />
            </div>
            <h2>Forgot Password?</h2>
            <p>
              No worries! Enter your email address below and we&apos;ll send you
              a link to reset your password.
            </p>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            <button
              type="button"
              onClick={handleSubmit}
              className={styles.submitButton}
            >
              Send Reset Link
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={styles.closeButton}
              onClick={handleClose}
              aria-label="Close"
            >
              ×
            </button>
            <div className={styles.successIcon}>
              <i className="bx bx-check" aria-hidden />
            </div>
            <h2>Check Your Email</h2>
            <p>
              We&apos;ve sent a password reset link to <strong>{email}</strong>.
              Please check your inbox and click the link to reset your password.
            </p>
            <p className={styles.tryAgain}>
              Didn&apos;t receive the email? Check your spam folder or{" "}
              <button
                type="button"
                className={styles.tryAgainLink}
                onClick={handleTryAgain}
              >
                try again
              </button>
            </p>
            <button
              type="button"
              onClick={handleClose}
              className={styles.submitButton}
            >
              Back to Log In
            </button>
          </>
        )}
      </div>
    </div>
  );
}
