/**
 * Lightweight validation helpers for auth-related forms.
 * These do not depend on any external libraries to keep the bundle small.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

export function validateNewPassword(password, confirmPassword) {
  if (!password || !confirmPassword) {
    return { valid: false, message: "Please fill in all fields" };
  }
  if (password.length < 6) {
    return {
      valid: false,
      message: "Password must be at least 6 characters long",
    };
  }
  if (password !== confirmPassword) {
    return { valid: false, message: "Passwords do not match" };
  }
  return { valid: true, message: "" };
}

