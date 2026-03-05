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
  const portal = searchParams.get("portal") ?? "buyer"; // "buyer" | "seller"
  const baseUrl = new URL(request.url).origin;
  const loginPath = portal === "seller" ? "/seller/login" : "/buyer/login";
  const loginUrl = new URL(loginPath, baseUrl);

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      loginUrl.searchParams.set("error", "Sign-in could not be completed. Please try again.");
      return NextResponse.redirect(loginUrl);
    }
    const callbackUrl = new URL("/auth/callback", baseUrl);
    callbackUrl.searchParams.set("redirect", redirectParam);
    if (portal && portal !== "buyer") {
      callbackUrl.searchParams.set("portal", portal);
    }
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

  let { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const email = user.email ?? "";
  const fullName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    "";

  // If no users row (e.g. OAuth signup before trigger ran or trigger not applied).
  if (!userRow?.role) {
    if (portal === "buyer") {
      // For buyer portal, create a buyer account and ensure profile exists.
      const { error: insertError } = await supabase
        .from("users")
        .insert({ id: user.id, email, role: "buyer" });
      if (insertError) {
        await supabase.auth.signOut();
        loginUrl.searchParams.set("error", "Your account is not configured for this portal.");
        return NextResponse.redirect(loginUrl);
      }
      userRow = { role: "buyer" };
      await supabase.from("profiles").upsert(
        { id: user.id, email, full_name: fullName },
        { onConflict: "id" }
      );
    } else if (portal === "seller") {
      // For seller portal, create a seller account and initial seller record.
      const { error: insertError } = await supabase
        .from("users")
        .insert({ id: user.id, email, role: "seller" });
      if (insertError) {
        await supabase.auth.signOut();
        loginUrl.searchParams.set("error", "Your account is not configured for this portal.");
        return NextResponse.redirect(loginUrl);
      }

      userRow = { role: "seller" };

      await supabase.from("profiles").upsert(
        { id: user.id, email, full_name: fullName },
        { onConflict: "id" }
      );

      const sellerPayload = {
        user_id: user.id,
        email,
        contact_name: fullName || email,
        status: "pending",
        registered_at: new Date().toISOString(),
      };

      const { error: sellerError } = await supabase
        .from("sellers")
        .upsert(sellerPayload, { onConflict: "user_id" });

      if (sellerError) {
        await supabase.auth.signOut();
        loginUrl.searchParams.set("error", "We could not complete your seller setup. Please try again.");
        return NextResponse.redirect(loginUrl);
      }
    } else {
      // Unknown portal type – treat as misconfiguration.
      await supabase.auth.signOut();
      loginUrl.searchParams.set("error", "Your account is not configured for this portal.");
      return NextResponse.redirect(loginUrl);
    }
  }

  // Ensure profile row exists (fixes OAuth users who have users but no profile, or updates name from provider).
  await supabase.from("profiles").upsert(
    { id: user.id, email, full_name: fullName },
    { onConflict: "id" }
  );

  // Enforce portal-specific role with clearer messaging.
  if (portal === "buyer" && userRow.role !== "buyer") {
    await supabase.auth.signOut();

    if (userRow.role === "seller") {
      loginUrl.searchParams.set(
        "error",
        "This account is registered as a seller. Please use the Seller Centre login instead."
      );
    } else {
      loginUrl.searchParams.set(
        "error",
        "Your account is not configured for the buyer portal. Please use the correct portal for your account."
      );
    }

    return NextResponse.redirect(loginUrl);
  }

  if (portal === "seller" && userRow.role !== "seller") {
    await supabase.auth.signOut();

    if (userRow.role === "buyer") {
      loginUrl.searchParams.set(
        "error",
        "This account is registered as a buyer. Please sign in on the buyer portal or start seller onboarding from your buyer account."
      );
    } else {
      loginUrl.searchParams.set(
        "error",
        "Your account is not configured for the seller portal. Please use the correct portal for your account."
      );
    }

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
