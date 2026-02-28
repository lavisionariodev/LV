"use client";

/**
 * OAuth callback for buyer sign-in only (e.g. Google).
 * Code exchange (PKCE) is performed in middleware; this page only reads session from cookies and enforces role.
 * Seller OAuth is not wired here yet. Enforces buyer role; admins/sellers are redirected to login.
 */
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { isAdmin } from "@/lib/auth/admin";
import { getUserRole } from "@/lib/auth/roles";
import { signOut } from "@/lib/auth/session";
import { useToast } from "@/contexts/ToastContext";

function AuthCallbackFallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "1rem",
        padding: "1rem",
      }}
    >
      <p style={{ margin: 0, color: "#555" }}>Loading…</p>
    </div>
  );
}

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      const codeFromParams = searchParams.get("code");
      const codeFromUrl =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("code")
          : null;
      const code = codeFromParams || codeFromUrl;
      const redirect = searchParams.get("redirect") || "/";
      const hasHash = typeof window !== "undefined" && !!window.location.hash;

      const fail = (message) => {
        if (!mounted) return;
        setStatus("error");
        toast.error(message || "Sign-in failed.");
        router.replace(`/buyer/login${message ? `?error=${encodeURIComponent(message)}` : ""}`);
      };

      if (code) {
        fail("Sign-in could not be completed. Please try again.");
        return;
      }

      try {
        if (hasHash) {
          const { data, error } = await supabase.auth.getSession();
          if (!mounted) return;
          if (error || !data?.session) {
            fail("Could not complete sign-in.");
            return;
          }
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (!mounted) return;
        if (userError || !user) {
          fail(
            "Missing sign-in data. Ensure Supabase Redirect URLs include this page (e.g. http://localhost:3000/auth/callback)."
          );
          return;
        }

        const admin = await isAdmin(supabase, user.id);
        if (!mounted) return;
        if (admin) {
          await signOut();
          toast.error("Please use the admin portal to sign in.");
          router.replace("/buyer/login");
          return;
        }

        const role = await getUserRole(user.id);
        if (!mounted) return;
        if (!role) {
          await signOut();
          toast.error("Your account is not configured for this portal.");
          router.replace("/buyer/login");
          return;
        }
        if (role !== "buyer") {
          await signOut();
          toast.error("Please use the correct portal for your account.");
          router.replace("/buyer/login");
          return;
        }

        toast.success("Login successful!");
        router.replace(redirect || "/");
      } catch (err) {
        console.error("Auth callback error:", err);
        if (mounted) fail(err?.message || "An error occurred.");
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [searchParams, router, toast]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "1rem",
        padding: "1rem",
      }}
    >
      {status === "loading" && (
        <>
          <div
            style={{
              width: 32,
              height: 32,
              border: "3px solid #e0e0e0",
              borderTopColor: "#204F38",
              borderRadius: "50%",
              animation: "authCallbackSpin 0.8s linear infinite",
            }}
          />
          <p style={{ margin: 0, color: "#555" }}>Signing you in…</p>
        </>
      )}
      {status === "error" && (
        <p style={{ margin: 0, color: "#555" }}>Redirecting to login…</p>
      )}
      <style dangerouslySetInnerHTML={{ __html: "@keyframes authCallbackSpin { to { transform: rotate(360deg); } }" }} />
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackFallback />}>
      <AuthCallbackInner />
    </Suspense>
  );
}
