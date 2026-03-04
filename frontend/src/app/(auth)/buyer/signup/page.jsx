// signup.jsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth/session";
import { signUpWithEmailPassword, signInWithOAuth } from "@/lib/auth/client";
import AuthLayout from "../AuthLayout";
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
    getUser().then((currentUser) => {
      if (!mounted) return;
      if (currentUser) {
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
        toast.error(error);
        return;
      }

      toast.success('Sign up successful! Please check your email to confirm your account, then sign in.');
      setSignUpData({ name: '', email: '', password: '' });
      router.push('/buyer/login');
    } catch (error) {
      console.error('Sign up error:', error);
      toast.error('An error occurred. Please try again later.');
    }
  };

  const handleSocialAuth = async (provider) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const redirectTo = `${origin}/auth/callback`;

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
        value={signUpData.name}
        onChange={handleSignUpChange}
      />
      <input
        type="email"
        name="email"
        placeholder="Enter E-mail"
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

      <button onClick={handleSignUp}>Sign Up</button>

      <div className={styles.authFooter}>
        Already have an account? <a href="/buyer/login">Sign In</a>
      </div>
    </AuthLayout>
  );
}