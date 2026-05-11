/**
 * Lightweight validation helpers for auth-related forms.
 * These do not depend on any external libraries to keep the bundle small.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_TOO_SHORT_MESSAGE = "Password must be at least 8 characters long";

/** Check password composition: at least one lowercase, one uppercase, one digit (matches Supabase Email provider). */
function validatePasswordStrength(password) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, message: PASSWORD_TOO_SHORT_MESSAGE };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must include at least one lowercase letter" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must include at least one uppercase letter" };
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: "Password must include at least one digit" };
  }
  return { valid: true, message: "" };
}

export function isValidEmail(email) {
  if (!email) {
    return { valid: false, message: "Email is required" };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, message: "Please enter a valid email address" };
  }
  return { valid: true, message: "" };
}

export function validateLoginPayload({ email, password }) {
  if (!email || !password) {
    return { valid: false, message: "Please fill in all fields" };
  }
  const emailCheck = isValidEmail(email);
  if (!emailCheck.valid) {
    return emailCheck;
  }
  return { valid: true, message: "" };
}

export function validateSignUpPayload({ name, email, password }) {
  if (!name?.trim() || !email || !password) {
    return { valid: false, message: "Please fill in all fields" };
  }
  const emailCheck = isValidEmail(email);
  if (!emailCheck.valid) {
    return emailCheck;
  }
  const strength = validatePasswordStrength(password);
  if (!strength.valid) {
    return strength;
  }
  return { valid: true, message: "" };
}

export function validateNewPassword(password, confirmPassword) {
  if (!password || !confirmPassword) {
    return { valid: false, message: "Please fill in all fields" };
  }
  const strength = validatePasswordStrength(password);
  if (!strength.valid) {
    return strength;
  }
  if (password !== confirmPassword) {
    return { valid: false, message: "Passwords do not match" };
  }
  return { valid: true, message: "" };
}

/** Change-password form: current password + new + confirm; new must differ from current. */
export function validateChangePasswordForm({ currentPassword, newPassword, confirmPassword }) {
  const cur = typeof currentPassword === "string" ? currentPassword : "";
  if (!cur.trim()) {
    return { valid: false, message: "Please enter your current password." };
  }
  const base = validateNewPassword(newPassword, confirmPassword);
  if (!base.valid) {
    return base;
  }
  if (newPassword === cur) {
    return {
      valid: false,
      message: "New password must be different from your current password.",
    };
  }
  return { valid: true, message: "" };
}