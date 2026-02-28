/**
 * Supabase auth middleware: exchanges OAuth code for session on /auth/callback (PKCE),
 * refreshes session on other requests. Session is stored in cookies for SSR.
 */
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function middleware(request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const cookiesToSet = [];

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
          cookiesToSet.push({ name, value, options });
        });
      },
    },
  });

  const { pathname, searchParams } = request.nextUrl;
  const code = searchParams.get("code");

  if (pathname === "/auth/callback" && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const loginUrl = new URL("/buyer/login", request.url);
      loginUrl.searchParams.set(
        "error",
        "Sign-in could not be completed. Please try again."
      );
      return NextResponse.redirect(loginUrl);
    }
    const redirectUrl = new URL("/auth/callback", request.url);
    const redirectParam = searchParams.get("redirect");
    if (redirectParam) redirectUrl.searchParams.set("redirect", redirectParam);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    cookiesToSet.forEach(({ name, value, options }) => {
      redirectResponse.cookies.set(name, value, options);
    });
    return redirectResponse;
  }

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
