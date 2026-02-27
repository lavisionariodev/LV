// signup.jsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getUser } from "@/lib/auth/session";
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
    if (!signUpData.name || !signUpData.email || !signUpData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signUpData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (signUpData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: {
            full_name: signUpData.name,
          },
        },
      });

      if (error) {
        toast.error(error.message || 'Sign up failed. Please try again.');
        return;
      }

      try {
        let userId = data?.user?.id || null;
        let email = data?.user?.email || null;

        if (!userId) {
          const { data: userData } = await supabase.auth.getUser();
          userId = userData?.user?.id ?? null;
          email = userData?.user?.email ?? null;
        }

        if (userId && email) {
          await supabase.from('users').upsert({
            id: userId,
            email,
            role: 'buyer',
          });
        }
      } catch (roleError) {
        console.error('Error upserting user role:', roleError);
        // Do not block signup on role upsert failure
      }

      toast.success('Sign up successful! Please check your email to confirm your account, then sign in.');
      setSignUpData({ name: '', email: '', password: '' });
      router.push('/buyer/login');
    } catch (error) {
      console.error('Sign up error:', error);
      toast.error('An error occurred. Please try again later.');
    }
  };

  const handleSocialAuth = (provider) => {
    toast.info(`${provider} authentication would be implemented here`);
  };

  return (
    <AuthLayout type="signup" showPanel={true}>
      <h1>Create Account</h1>
      
      <div className={styles.socialIcons}>
        <a
          onClick={() => handleSocialAuth('google')}
          aria-label="Google"
          title="Google"
        >
          <i className='bx bxl-google'></i>
          <span className={styles.socialLabel}>Google</span>
        </a>
        <a
          onClick={() => handleSocialAuth('facebook')}
          aria-label="Facebook"
          title="Facebook"
        >
          <i className='bx bxl-facebook'></i>
          <span className={styles.socialLabel}>Facebook</span>
        </a>
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