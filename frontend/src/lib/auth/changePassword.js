import { validateChangePasswordForm } from "@/lib/validators/authSchemas";
import { signOutOtherSessions } from "@/lib/auth/session";

/**
 * Verify current password (re-auth), set new password, then revoke other sessions.
 * Uses session user email from getUser() — not profile draft email.
 *
 * JWT caveat: scope "others" revokes other refresh tokens; access tokens may live until exp.
 */
function mapReauthError(err) {
  const code = err?.code;
  const msg = String(err?.message || "").toLowerCase();
  if (
    code === "invalid_credentials" ||
    msg.includes("invalid login") ||
    msg.includes("invalid email or password")
  ) {
    return "Current password is incorrect.";
  }
  if (msg.includes("email not confirmed")) {
    return "Confirm your email before changing your password.";
  }
  return (
    err?.message ||
    "Could not verify your current password. If you sign in with Google or another provider, use that method or reset your password by email."
  );
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ currentPassword: string, newPassword: string, confirmPassword: string }} fields
 * @returns {Promise<{ ok: true, warning: string | null } | { ok: false, error: string, warning: null }>}
 */
export async function changePasswordWithReauth(supabase, fields) {
  const validation = validateChangePasswordForm(fields);
  if (!validation.valid) {
    return { ok: false, error: validation.message, warning: null };
  }

  const { currentPassword, newPassword } = fields;

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user?.email) {
    return {
      ok: false,
      error: "Could not verify your account. Try signing in again.",
      warning: null,
    };
  }

  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signInErr) {
    return { ok: false, error: mapReauthError(signInErr), warning: null };
  }

  const { error: updErr } = await supabase.auth.updateUser({ password: newPassword });
  if (updErr) {
    return {
      ok: false,
      error: updErr.message || "Failed to update password.",
      warning: null,
    };
  }

  const { error: othersErr } = await signOutOtherSessions(supabase);
  if (othersErr) {
    return {
      ok: true,
      warning:
        "We could not sign out your other devices automatically—you can try again or use sign out everywhere from account security if available.",
    };
  }

  return { ok: true, warning: null };
}
