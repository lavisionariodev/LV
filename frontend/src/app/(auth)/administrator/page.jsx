"use client";

import { useState } from "react";
import { MdOutlineAdminPanelSettings } from "react-icons/md";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import styles from "./login.module.css";

export default function AdminLoginPage() {
  const [signInData, setSignInData] = useState({ email: "", password: "" });

  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordSubmitted, setForgotPasswordSubmitted] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setSignInData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSignIn = async (e) => {
    e.preventDefault();

    if (!signInData.email || !signInData.password) {
      alert("Please fill in all fields");
      return;
    }

    alert("Login successful! (mock)");
    window.location.href = "/admin";
  };

  const handleForgotPasswordSubmit = async () => {
    if (!forgotPasswordEmail) {
      alert("Please enter your email address");
      return;
    }

    setForgotPasswordSubmitted(true);
  };

  const closeForgotPasswordModal = () => {
    setShowForgotPasswordModal(false);
    setForgotPasswordEmail("");
    setForgotPasswordSubmitted(false);
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

            <button type="submit" className={styles.primaryBtn}>
              Log in
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
                  Enter your admin email and we&quot;ll send a reset link.
                </p>

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
    </>
  );
}