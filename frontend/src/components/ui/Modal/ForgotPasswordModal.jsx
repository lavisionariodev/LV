"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { isValidEmail } from "@/lib/validators/authSchemas";
import styles from "./ForgotPasswordModal.module.css";
import BodyPortal from "./BodyPortal";

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
  const [sending, setSending] = useState(false);

  const safePortal = VALID_PORTALS.includes(portal) ? portal : "buyer";

  const handleSubmit = async () => {
    const trimmed = email?.trim();
    if (!trimmed) {
      onError?.("Please enter your email address.");
      return;
    }
    const emailCheck = isValidEmail(trimmed);
    if (!emailCheck.valid) {
      onError?.(emailCheck.message);
      return;
    }
    setSending(true);
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const requestedAt = Date.now();
      const redirectTo = `${origin}/auth/reset-password?portal=${safePortal}&requested_at=${requestedAt}`;
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo,
      });
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
    } finally {
      setSending(false);
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
    <BodyPortal>
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
              <span className={styles.iconGraphic} aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <rect
                    x="3"
                    y="5"
                    width="18"
                    height="14"
                    rx="2"
                    ry="2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <polyline
                    points="4 6.5 12 12 20 6.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
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
              disabled={sending}
            >
              {sending ? "Sending…" : "Send Reset Link"}
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
              <span className={styles.iconGraphic} aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <polyline
                    points="8 12.5 11 15.5 16 9.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
            <h2>Check Your Email</h2>
            <p>
              We&apos;ve sent a password reset link to <strong>{email}</strong>.
              Please check your inbox and click the link to reset your password.
              The link expires in 5 minutes.
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
    </BodyPortal>
  );
}
