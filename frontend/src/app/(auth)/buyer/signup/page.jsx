// signup.jsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth/session";
import { getUserRole, ROLE_BUYER } from "@/lib/auth/roles";
import Link from "next/link";
import { signUpWithEmailPassword, signInWithOAuth, getOAuthRedirectUrl } from "@/lib/auth/client";
import AuthLayout, { setBuyerAuthSwitch } from "../AuthLayout";
import styles from "./signup.module.css";
import { useToast } from "@/contexts/ToastContext";

export default function SignUpPage() {
  const [signUpData, setSignUpData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    let mounted = true;
    getUser().then(async (currentUser) => {
      if (!mounted || !currentUser) return;
      const role = await getUserRole(currentUser.id);
      if (role === ROLE_BUYER) {
        router.replace("/");
      }
    });
    return () => {
      mounted = false;
    };
  }, [router]);

  const handleSignUpChange = (e) => {
    setSignUpData({
      ...signUpData,
      [e.target.name]: e.target.value
    });
  };

  const handleSignUp = async () => {
    try {
      const { error } = await signUpWithEmailPassword({
        name: signUpData.name,
        email: signUpData.email,
        password: signUpData.password,
        role: 'buyer',
      });

      if (error) {
        const message = typeof error === "string" ? error : String(error);
        if (message.toLowerCase().includes("already registered")) {
          toast.error("This email is already registered. Please log in instead.");
          router.push("/buyer/login");
        } else {
          toast.error(message);
        }
        return;
      }

      toast.success('Sign up successful! Please check your email to confirm your account, then log in.');
      setSignUpData({ name: '', email: '', password: '' });
      router.push('/buyer/login');
    } catch (error) {
      console.error('Sign up error:', error);
      toast.error('An error occurred. Please try again later.');
    }
  };

  const handleSocialAuth = async (provider) => {
    const redirectTo = getOAuthRedirectUrl({ redirectPath: "/" });

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
    <AuthLayout type="signup" showPanel={true}>
      <h1>Create Account</h1>

      <div className={styles.socialButtons}>
        <button
          type="button"
          className={styles.socialButton}
          onClick={() => handleSocialAuth('Facebook')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877f2">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Facebook
        </button>
        <button
          type="button"
          className={styles.socialButton}
          onClick={() => handleSocialAuth('Google')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google
        </button>
      </div>

      <span>Register with E-mail</span>

      <input
        type="text"
        name="name"
        placeholder="Name"
        className={styles.nameInput}
        value={signUpData.name}
        onChange={handleSignUpChange}
      />
      <input
        type="email"
        name="email"
        placeholder="Enter E-mail"
        className={styles.emailInput}
        value={signUpData.email}
        onChange={handleSignUpChange}
      />
      <div className={styles.passwordInputWrap}>
        <input
          type={showPassword ? "text" : "password"}
          name="password"
          placeholder="Enter Password"
          value={signUpData.password}
          onChange={handleSignUpChange}
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

      <button onClick={handleSignUp}>Sign Up</button>

      <div className={styles.authFooter}>
        Already have an account? <Link href="/buyer/login" onClick={setBuyerAuthSwitch}>Log In</Link>
      </div>
    </AuthLayout>
  );
}