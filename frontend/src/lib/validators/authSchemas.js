/**
 * Lightweight validation helpers for auth-related forms.
 * These do not depend on any external libraries to keep the bundle small.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;
const PASSWORD_TOO_SHORT_MESSAGE = "Password must be at least 6 characters long";

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
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, message: PASSWORD_TOO_SHORT_MESSAGE };
  }
  return { valid: true, message: "" };
}

export function validateNewPassword(password, confirmPassword) {
  if (!password || !confirmPassword) {
    return { valid: false, message: "Please fill in all fields" };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, message: PASSWORD_TOO_SHORT_MESSAGE };
  }
  if (password !== confirmPassword) {
    return { valid: false, message: "Passwords do not match" };
  }
  return { valid: true, message: "" };
}