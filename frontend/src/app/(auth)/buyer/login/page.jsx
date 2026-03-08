"use client";

import { Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthLayout, { setBuyerAuthSwitch } from '../AuthLayout';
import styles from './login.module.css';
import { loginWithEmailPassword, signInWithOAuth, getOAuthRedirectUrl } from '@/lib/auth/client';
import { getUser } from "@/lib/auth/session";
import ForgotPasswordModal from '@/components/ui/Modal/ForgotPasswordModal';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase/client';
import { isAdmin } from '@/lib/auth/admin';
import { getUserRole, ROLE_BUYER } from '@/lib/auth/roles';
import { getSafeRedirect } from '@/utils/safeRedirect';

function BuyerLoginPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirect = getSafeRedirect(searchParams.get("redirect"));
  const toast = useToast();

  const [signInData, setSignInData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const hasShownErrorRef = useRef(false);
  const showForgotPasswordModalRef = useRef(false);
  showForgotPasswordModalRef.current = showForgotPasswordModal;

  // Redirect recovery link to shared reset-password page (preserve hash)
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash || "";
    if (hash.includes("type=recovery")) {
      window.location.replace(`${window.location.origin}/auth/reset-password?portal=buyer${hash}`);
    }
  }, []);

  // Strip OAuth hash fragment (e.g. #_=_ from Facebook) so the URL stays clean; don't strip recovery
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash && !window.location.hash.includes("type=recovery")) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam && !hasShownErrorRef.current) {
      hasShownErrorRef.current = true;
      toast.error(decodeURIComponent(errorParam));
    }
  }, [searchParams, toast]);

  useEffect(() => {
    let mounted = true;
    getUser().then(async (currentUser) => {
      if (!mounted) return;
      if (!currentUser) return;
      if (showForgotPasswordModalRef.current) return;
      const role = await getUserRole(currentUser.id);
      if (role === ROLE_BUYER) {
        router.replace(redirect);
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
        toast.error('Please use the admin portal to log in.');
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
      router.replace(redirect);
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An error occurred. Please try again later.');
    }
  };

  const handleSocialAuth = async (provider) => {
    const redirectTo = getOAuthRedirectUrl({
      redirectPath: redirect !== '/' ? redirect : undefined,
    });

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

  return (
    <>
      <AuthLayout type="signin" showPanel={true}>
        <h1>Log In</h1>

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

        <span>Log in With Email &amp; Password</span>

        <input
          type="email"
          name="email"
          placeholder="Enter E-mail"
          className={styles.emailInput}
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
          <button
            type="button"
            className={styles.eyeIcon}
            onClick={() => setShowPassword((p) => !p)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
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

        <div className={styles.forgotPasswordWrap}>
          <button
            type="button"
            className={styles.forgotPasswordLink}
            onClick={() => {
              showForgotPasswordModalRef.current = true;
              setShowForgotPasswordModal(true);
            }}
          >
            Forgot Password?
          </button>
        </div>

        <button onClick={handleSignIn}>Log In</button>

        <div className={styles.authFooter}>
          Don't have an account? <Link href="/buyer/signup" onClick={setBuyerAuthSwitch}>Sign Up</Link>
        </div>
      </AuthLayout>

      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
        portal="buyer"
        onError={(msg) => toast.error(msg)}
      />
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

