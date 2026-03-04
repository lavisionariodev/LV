import { supabase } from "@/lib/supabase/client";
import { validateLoginPayload, validateSignUpPayload } from "@/lib/validators/authSchemas";

export async function loginWithEmailPassword({ email, password }) {
  const validation = validateLoginPayload({ email, password });
  if (!validation.valid) {
    return { data: null, error: validation.message };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      data: null,
      error: error.message || "Login failed. Please check your credentials.",
    };
  }

  return { data, error: null };
}

/**
 * Sign up with email/password (buyer or seller).
 * Users and profiles rows are created by DB trigger on auth.users insert.
 * @param {{ name: string, email: string, password: string, role?: 'buyer' | 'seller' }}
 */
export async function signUpWithEmailPassword({ name, email, password, role = "buyer" }) {
  const validation = validateSignUpPayload({ name, email, password });
  if (!validation.valid) {
    return { data: null, error: validation.message };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name.trim(),
        role: role === "seller" ? "seller" : "buyer",
      },
    },
  });

  if (error) {
    return {
      data: null,
      error: error.message || "Sign up failed. Please try again.",
    };
  }

  return { data, error: null };
}

/**
 * Send an email OTP for signup/verification.
 * Supabase will create the auth user (with the given role) if they do not exist yet.
 * The actual 6-digit code is included via the email template using {{ .Token }}.
 * @param {{ email: string, role?: 'buyer' | 'seller' }}
 */
export async function sendEmailOtpForSignup({ email, role = "buyer" }) {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    return { data: null, error: "Email is required." };
  }

  const { data, error } = await supabase.auth.signInWithOtp({
    email: trimmedEmail,
    options: {
      shouldCreateUser: true,
      data: {
        role: role === "seller" ? "seller" : "buyer",
      },
    },
  });

  if (error) {
    return {
      data: null,
      error: error.message || "Failed to send verification code. Please try again.",
    };
  }

  return { data, error: null };
}

/**
 * Verify an email OTP code that was sent via sendEmailOtpForSignup.
 * On success, the user will be logged in with a valid session.
 * @param {{ email: string, token: string }}
 */
export async function verifyEmailOtpForSignup({ email, token }) {
  const trimmedEmail = email.trim();
  const trimmedToken = token.trim();

  if (!trimmedEmail || !trimmedToken) {
    return { data: null, error: "Email and verification code are required." };
  }

  const {
    data,
    error,
  } = await supabase.auth.verifyOtp({
    email: trimmedEmail,
    token: trimmedToken,
    type: "email",
  });

  if (error) {
    return {
      data: null,
      error: error.message || "Invalid or expired verification code.",
    };
  }

  return { data, error: null };
}

/**
 * Start OAuth sign-in (e.g. Google). Redirects the user to the provider.
 * After auth, the provider redirects to redirectTo (e.g. /auth/callback).
 * @param {{ provider: 'google' | 'facebook' | 'github' | string, redirectTo: string }}
 */
export async function signInWithOAuth({ provider, redirectTo }) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });
  if (error) {
    return { data: null, error: error.message };
  }
  return { data, error: null };
}