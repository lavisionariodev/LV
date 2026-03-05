"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthLayout from '../AuthLayout';
import styles from './login.module.css';
import { loginWithEmailPassword, signInWithOAuth } from '@/lib/auth/client';
import {
  requestPasswordReset,
  resetPasswordWithToken,
} from '@/lib/auth/password';
import { getUser } from "@/lib/auth/session";
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase/client';
import { isAdmin } from '@/lib/auth/admin';
import { getUserRole, ROLE_BUYER } from '@/lib/auth/roles';

function BuyerLoginPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirect = searchParams.get("redirect") || "/";
  const toast = useToast();

  const [signInData, setSignInData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordSubmitted, setForgotPasswordSubmitted] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  const [resetData, setResetData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const hasShownErrorRef = useRef(false);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam && !hasShownErrorRef.current) {
      hasShownErrorRef.current = true;
      toast.error(decodeURIComponent(errorParam));
    }
  }, [searchParams, toast]);

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      setShowResetPasswordModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    getUser().then((currentUser) => {
      if (!mounted) return;
      if (currentUser) {
        const target = redirect || "/";
        router.replace(target);
      }
    });
    return () => {
      mounted = false;
    };
  }, [redirect, router]);

  const handleSignInChange = (e) => {
    setSignInData({
      ...signInData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSignIn = async () => {
    try {
      const { error } = await loginWithEmailPassword({
        email: signInData.email,
        password: signInData.password,
      });

      if (error) {
        toast.error(error);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Unable to load your account. Please try again.');
        return;
      }

      const admin = await isAdmin(supabase, user.id);
      if (admin) {
        await supabase.auth.signOut();
        toast.error('Please use the admin portal to sign in.');
        return;
      }

      const role = await getUserRole(user.id);
      if (!role) {
        toast.error('Your account is not configured for this portal.');
        await supabase.auth.signOut();
        return;
      }

      if (role !== ROLE_BUYER) {
        toast.error('Please use the correct portal for your account.');
        await supabase.auth.signOut();
        return;
      }

      toast.success('Login successful!');
      router.replace(redirect || '/');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An error occurred. Please try again later.');
    }
  };

  const handleSocialAuth = async (provider) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const redirectTo =
      redirect && redirect !== "/"
        ? `${origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`
        : `${origin}/auth/callback`;

    if (provider === "Google") {
      const { error } = await signInWithOAuth({ provider: "google", redirectTo });
      if (error) toast.error(error);
      return;
    }
    if (provider === "Facebook") {
      const { error } = await signInWithOAuth({ provider: "facebook", redirectTo });
      if (error) toast.error(error);
      return;
    }
    toast.info(`${provider} authentication would be implemented here`);
  };

  const handleForgotPasswordSubmit = async () => {
    try {
      const result = await requestPasswordReset(forgotPasswordEmail);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setForgotPasswordSubmitted(true);
    } catch (error) {
      console.error('Forgot password error:', error);
      toast.error('An error occurred. Please try again later.');
    }
  };

  const closeForgotPasswordModal = () => {
    setShowForgotPasswordModal(false);
    setForgotPasswordEmail('');
    setForgotPasswordSubmitted(false);
  };

  const handleResetPasswordChange = (e) => {
    setResetData({
      ...resetData,
      [e.target.name]: e.target.value,
    });
  };

  const handleResetPassword = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const resetToken = urlParams.get('token');

      const result = await resetPasswordWithToken(
        resetToken,
        resetData.password,
        resetData.confirmPassword
      );

      if (!result.ok) {
        alert(result.message);
        return;
      }

      alert('Password reset successful! Please login with your new password.');
      setShowResetPasswordModal(false);
      setResetData({ password: '', confirmPassword: '' });
    } catch (error) {
      console.error('Reset password error:', error);
      alert('An error occurred. Please try again later.');
    }
  };

  const closeResetPasswordModal = () => {
    setShowResetPasswordModal(false);
    setResetData({ password: '', confirmPassword: '' });
  };

  return (
    <>
      <AuthLayout type="signin" showPanel={true}>
        <h1>Sign In</h1>

        <div className={styles.socialButtons}>
          <button
            type="button"
            className={styles.socialButton}
            onClick={() => handleSocialAuth('Facebook')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877f2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook
          </button>
          <button
            type="button"
            className={styles.socialButton}
            onClick={() => handleSocialAuth('Google')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>
        </div>

        <span>Sign in With Email &amp; Password</span>

        <input
          type="email"
          name="email"
          placeholder="Enter E-mail"
          value={signInData.email}
          onChange={handleSignInChange}
        />
        <div className={styles.passwordInputWrap}>
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Enter Password"
            value={signInData.password}
            onChange={handleSignInChange}
          />
          <span
            className={styles.passwordToggle}
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-80%)",
              left: "auto",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "24px",
              height: "24px",
            }}
            onClick={() => setShowPassword((p) => !p)}
          >
            <i className={showPassword ? "bx bx-hide" : "bx bx-show"} />
          </span>
        </div>

        <div className={styles.forgotPasswordWrap}>
          <a
            className={styles.forgotPasswordLink}
            onClick={() => setShowForgotPasswordModal(true)}
          >
            Forgot Password?
          </a>
        </div>

        <button onClick={handleSignIn}>Sign In</button>

        <div className={styles.authFooter}>
          Don't have an account? <a href="/buyer/signup">Sign Up</a>
        </div>
      </AuthLayout>

      {showForgotPasswordModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            {!forgotPasswordSubmitted ? (
              <>
                <button
                  className={styles.closeButton}
                  onClick={closeForgotPasswordModal}
                >
                  ×
                </button>
                <div className={styles.iconContainer}>
                  <i className="bx bx-envelope"></i>
                </div>
                <h2>Forgot Password?</h2>
                <p>
                  No worries! Enter your email address below and we'll send you a
                  link to reset your password.
                </p>

                <input
                  type="email"
                  placeholder="Enter your email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                />

                <button
                  onClick={handleForgotPasswordSubmit}
                  className={styles.submitButton}
                >
                  Send Reset Link
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
                <div className={styles.successIcon}>
                  <i className="bx bx-check"></i>
                </div>
                <h2>Check Your Email</h2>
                <p>
                  We've sent a password reset link to{' '}
                  <strong>{forgotPasswordEmail}</strong>. Please check your inbox
                  and click the link to reset your password.
                </p>
                <p style={{ fontSize: '12px', marginTop: '10px' }}>
                  Didn't receive the email? Check your spam folder or{' '}
                  <a
                    onClick={() => {
                      setForgotPasswordSubmitted(false);
                      setForgotPasswordEmail('');
                    }}
                    style={{ cursor: 'pointer', color: '#204F38' }}
                  >
                    try again
                  </a>
                </p>
                <button
                  onClick={closeForgotPasswordModal}
                  className={styles.submitButton}
                >
                  Back to Sign In
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {showResetPasswordModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <button
              className={styles.closeButton}
              onClick={closeResetPasswordModal}
            >
              ×
            </button>
            <div className={styles.iconContainer}>
              <i className="bx bx-lock-alt"></i>
            </div>
            <h2>Reset Password</h2>
            <p>
              Enter your new password below. Use at least 8 characters with
              lowercase, uppercase, and digits.
            </p>

            <input
              type="password"
              name="password"
              placeholder="New Password"
              value={resetData.password}
              onChange={handleResetPasswordChange}
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
              value={resetData.confirmPassword}
              onChange={handleResetPasswordChange}
            />

            <button
              onClick={handleResetPassword}
              className={styles.submitButton}
            >
              Reset Password
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function BuyerLoginPage() {
  return (
    <Suspense fallback={null}>
      <BuyerLoginPageInner />
    </Suspense>
  );
}

