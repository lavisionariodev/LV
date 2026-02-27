import { isValidEmail, validateNewPassword } from "@/lib/validators/authSchemas";

export async function requestPasswordReset(email) {
  const emailCheck = isValidEmail(email);
  if (!emailCheck.valid) {
    return { ok: false, message: emailCheck.message };
  }

  const response = await fetch("/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      ok: false,
      message: data.message || "Failed to send reset email. Please try again.",
    };
  }

  return { ok: true, message: "" };
}

export async function resetPasswordWithToken(token, password, confirmPassword) {
  const validation = validateNewPassword(password, confirmPassword);
  if (!validation.valid) {
    return { ok: false, message: validation.message };
  }

  if (!token) {
    return { ok: false, message: "Invalid reset link" };
  }

  const response = await fetch("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      ok: false,
      message: data.message || "Password reset failed. Please try again.",
    };
  }

  return { ok: true, message: "" };
}

