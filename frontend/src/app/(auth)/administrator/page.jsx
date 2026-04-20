"use client";

import { useState, useLayoutEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MdOutlineAdminPanelSettings } from "react-icons/md";
import { supabase } from "@/lib/supabase/client";
import { isAdmin } from "@/lib/auth/admin";
import { signOut } from "@/lib/auth/session";
import ForgotPasswordModal from "@/components/ui/Modal/ForgotPasswordModal";
import styles from "./administrator.module.css";
import { useSiteContent } from "@/lib/siteContent/client";
import { useToast } from "@/contexts/ToastContext";

export default function AdminLoginPage() {
  const { data: siteContent } = useSiteContent();
  const systemName = siteContent?.systemName || "La Visionario";

  const router = useRouter();
  const toast = useToast();
  const [signInData, setSignInData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash || "";
    if (hash.includes("type=recovery")) {
      window.location.replace(`${window.location.origin}/auth/reset-password?portal=administrator${hash}`);
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
      const raw = signInError.message || "Login failed. Please check your credentials.";
      const normalized = raw.toLowerCase();
      if (normalized.includes("invalid login credentials")) {
        setError(
          "Invalid login credentials. Admin accounts must exist in Supabase Authentication (email/password) and be whitelisted in the admins table."
        );
      } else {
        setError(raw);
      }
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
    toast.success("Welcome back to Administrator Centre!");
    router.push("/admin");
  };

  return (
    <div className={styles.pageWrapper}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link href="/" className={styles.logo} aria-label={`${systemName} home`}>
            <div className={styles.logoIcon}>
              <span className={styles.logoLetter}>L</span>
            </div>
            <span className={styles.logoText}>{systemName}</span>
            <span className={styles.badge}>Administrator</span>
          </Link>

        </div>
      </header>

      <div className={styles.mainContent}>
        <div className={styles.contentWrapper}>
          <div className={styles.leftSection}>
            <div className={styles.adminIcon}>
              <MdOutlineAdminPanelSettings />
            </div>
            <h1 className={styles.mainTitle}>Administrator Portal</h1>
            <p className={styles.mainSubtitle}>
              Manage platform settings, content, and users with the<br />
              {systemName} Administrator Centre.
            </p>
            <p className={styles.secureNote}>This is a secure login auth.</p>
          </div>

          <div className={styles.rightSection}>
            <div className={styles.loginCard}>
              <div className={styles.mobileLogoWrap}>
                <div className={styles.mobileLogoIcon}>
                  <MdOutlineAdminPanelSettings />
                </div>
              </div>
              <h2 className={styles.heading}>Admin Login</h2>
              <p className={styles.subheading}>Login to your admin account</p>

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
                      className={styles.eyeIcon}
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="12" cy="12" r="3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
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
                  {loading ? "Signing In…" : "Log In"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => {
          setShowForgotPasswordModal(false);
          setError("");
        }}
        portal="administrator"
        onError={setError}
      />
    </div>
  );
}