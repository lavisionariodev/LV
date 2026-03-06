"use client";

import { useState, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { MdOutlineAdminPanelSettings } from "react-icons/md";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import { supabase } from "@/lib/supabase/client";
import { isAdmin } from "@/lib/auth/admin";
import { signOut } from "@/lib/auth/session";
import { validateNewPassword } from "@/lib/validators/authSchemas";
import styles from "./login.module.css";

export default function AdminLoginPage() {
  const router = useRouter();
  const [signInData, setSignInData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordSubmitted, setForgotPasswordSubmitted] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [resetData, setResetData] = useState({ password: "", confirmPassword: "" });
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [recoveryFromHash, setRecoveryFromHash] = useState(false);

  useLayoutEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash && hash.includes("type=recovery")) {
      setRecoveryFromHash(true);
      setShowResetPasswordModal(true);
    }
  }, []);

  const handleChange = (e) => {
    setSignInData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!signInData.email || !signInData.password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setError("");
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: signInData.email,
      password: signInData.password,
    });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    const admin = await isAdmin(supabase, data.user?.id);
    if (!admin) {
      await signOut();
      setError("Access denied. Admin only.");
      setLoading(false);
      return;
    }
    setLoading(false);
    router.push("/admin");
  };

  const handleForgotPasswordSubmit = async () => {
    if (!forgotPasswordEmail) {
      setError("Please enter your email address");
      return;
    }
    setError("");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      forgotPasswordEmail,
      { redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/administrator?reset=1` }
    );
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setForgotPasswordSubmitted(true);
  };

  const closeForgotPasswordModal = () => {
    setShowForgotPasswordModal(false);
    setForgotPasswordEmail("");
    setForgotPasswordSubmitted(false);
    setError("");
  };

  const handleResetPasswordChange = (e) => {
    setResetData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleResetPassword = async () => {
    const validation = validateNewPassword(resetData.password, resetData.confirmPassword);
    if (!validation.valid) {
      setError(validation.message);
      return;
    }
    setError("");
    try {
      if (recoveryFromHash) {
        const { error: updateError } = await supabase.auth.updateUser({
          password: resetData.password,
        });
        if (updateError) {
          setError(updateError.message || "Password reset failed. Please try again.");
          return;
        }
        await supabase.auth.signOut();
        setShowResetPasswordModal(false);
        setResetData({ password: "", confirmPassword: "" });
        setRecoveryFromHash(false);
        if (typeof window !== "undefined" && window.location.hash) {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
        setError("");
        return;
      }
      setError("Invalid reset link. Please use the link from your email or request a new one.");
    } catch (err) {
      console.error("Reset password error:", err);
      setError("An error occurred. Please try again later.");
    }
  };

  const closeResetPasswordModal = () => {
    setShowResetPasswordModal(false);
    setResetData({ password: "", confirmPassword: "" });
    setRecoveryFromHash(false);
    setError("");
  };

  return (
    <>
      <div className={styles.authContainer}>
        <div className={styles.authForm}>
          <div className={styles.adminIcon}>
            <MdOutlineAdminPanelSettings />
          </div>

          <h1 className={styles.heading}>Administrator Login</h1>
          <p className={styles.subheading}>Enter your credentials to continue.</p>

          {error && !showForgotPasswordModal && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <form className={styles.form} onSubmit={handleSignIn}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="adminEmail">
                Email
              </label>
              <input
                id="adminEmail"
                type="email"
                name="email"
                value={signInData.email}
                onChange={handleChange}
                placeholder="admin@email.com"
                className={styles.input}
                autoComplete="email"
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="adminPassword">
                Password
              </label>

              <div className={styles.passwordWrapper}>
                <input
                  id="adminPassword"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={signInData.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  className={styles.input}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className={styles.eyeButton}
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaRegEyeSlash /> : <FaRegEye />}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowForgotPasswordModal(true)}
                className={styles.forgotBelow}
              >
                Forgot password?
              </button>
            </div>

            <button type="submit" className={styles.primaryBtn} disabled={loading}>
              {loading ? "Signing in…" : "Log in"}
            </button>
          </form>
        </div>
      </div>

      {showForgotPasswordModal && (
        <div className={styles.modalOverlay} onClick={closeForgotPasswordModal}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            {!forgotPasswordSubmitted ? (
              <>
                <button
                  className={styles.closeButton}
                  onClick={closeForgotPasswordModal}
                >
                  ×
                </button>

                <h2 className={styles.modalTitle}>Reset Password</h2>
                <p className={styles.modalText}>
                  Enter your admin email and we&apos;ll send a reset link.
                </p>

                {error && (
                  <p className={styles.error} role="alert">
                    {error}
                  </p>
                )}

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="forgotEmail">
                    Email
                  </label>
                  <input
                    id="forgotEmail"
                    type="email"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    className={styles.input}
                    placeholder="admin@email.com"
                    autoComplete="email"
                    required
                  />
                </div>

                <button
                  onClick={handleForgotPasswordSubmit}
                  className={styles.primaryBtn}
                  type="button"
                >
                  Send reset link
                </button>
              </>
            ) : (
              <>
                <button
                  className={styles.closeButton}
                  onClick={closeForgotPasswordModal}
                >
                  ×
                </button>

                <h2 className={styles.modalTitle}>Email Sent</h2>
                <p className={styles.modalText}>
                  We sent a reset link to <strong>{forgotPasswordEmail}</strong>.
                </p>

                <button
                  onClick={closeForgotPasswordModal}
                  className={styles.primaryBtn}
                  type="button"
                >
                  Back to login
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {showResetPasswordModal && (
        <div className={styles.modalOverlay} onClick={closeResetPasswordModal}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.closeButton}
              onClick={closeResetPasswordModal}
            >
              ×
            </button>
            <h2 className={styles.modalTitle}>Set New Password</h2>
            <p className={styles.modalText}>
              Enter your new password. Use at least 8 characters with lowercase, uppercase, and digits.
            </p>
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="newPassword">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                name="password"
                value={resetData.password}
                onChange={handleResetPasswordChange}
                className={styles.input}
                placeholder="New password"
                autoComplete="new-password"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                value={resetData.confirmPassword}
                onChange={handleResetPasswordChange}
                className={styles.input}
                placeholder="Confirm new password"
                autoComplete="new-password"
              />
            </div>
            <button
              onClick={handleResetPassword}
              className={styles.primaryBtn}
              type="button"
            >
              Reset Password
            </button>
          </div>
        </div>
      )}
    </>
  );
}