import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /auth/callback - Single handler for Google OAuth.
 * 1. If ?code=...: exchange code for session, then redirect back here without code.
 * 2. If no code: read session, run role checks, redirect to / or /buyer/login.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectParam = searchParams.get("redirect") ?? "/";
  const baseUrl = new URL(request.url).origin;
  const loginUrl = new URL("/buyer/login", baseUrl);

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      loginUrl.searchParams.set("error", "Sign-in could not be completed. Please try again.");
      return NextResponse.redirect(loginUrl);
    }
    const callbackUrl = new URL("/auth/callback", baseUrl);
    callbackUrl.searchParams.set("redirect", redirectParam);
    return NextResponse.redirect(callbackUrl);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    loginUrl.searchParams.set(
      "error",
      "Missing sign-in data. Add your callback URL in Supabase (e.g. https://yoursite.com/auth/callback)."
    );
    return NextResponse.redirect(loginUrl);
  }

  const { data: adminRow } = await supabase
    .from("admins")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (adminRow) {
    await supabase.auth.signOut();
    loginUrl.searchParams.set("error", "Please use the admin portal to sign in.");
    return NextResponse.redirect(loginUrl);
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!userRow?.role) {
    await supabase.auth.signOut();
    loginUrl.searchParams.set("error", "Your account is not configured for this portal.");
    return NextResponse.redirect(loginUrl);
  }
  if (userRow.role !== "buyer") {
    await supabase.auth.signOut();
    loginUrl.searchParams.set("error", "Please use the correct portal for your account.");
    return NextResponse.redirect(loginUrl);
  }

  const safePath =
    typeof redirectParam === "string" &&
    redirectParam.startsWith("/") &&
    !redirectParam.startsWith("//")
      ? redirectParam
      : "/";
  return NextResponse.redirect(new URL(safePath, baseUrl));
}
