/**
 * Supabase auth middleware: refreshes session (token refresh) so cookies stay up to date.
 * OAuth code exchange is done in app/(auth)/auth/callback/route.js so cookies set correctly in production.
 *
 * Refreshes Supabase session cookies and gates `/admin/**` routes.
 * Unauthenticated or non-admin users are redirected to `/administrator`.
 * The admin app layout runs a client-side `requireAdmin()` check as a fallback.
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

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookies) {
        cookies.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isSellerRoute = pathname === "/seller" || pathname.startsWith("/seller/");
  const isPublicSellerRoute =
    pathname === "/seller/login" ||
    pathname === "/seller/signup" ||
    pathname === "/seller/register" ||
    pathname === "/seller/need_help" ||
    pathname === "/seller/onboarding";

  if (isAdminRoute) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/administrator";
      url.search = "";
      return NextResponse.redirect(url);
    }

    const { data: adminRow } = await supabase
      .from("admins")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!adminRow) {
      const url = request.nextUrl.clone();
      url.pathname = "/administrator";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  if (isSellerRoute && !isPublicSellerRoute) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/seller/login";
      url.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(url);
    }

    const [{ data: roleRow }, { data: sellerRow }] = await Promise.all([
      supabase.from("users").select("role").eq("id", user.id).maybeSingle(),
      supabase.from("sellers").select("status").eq("user_id", user.id).maybeSingle(),
    ]);

    if (roleRow?.role !== "seller") {
      const url = request.nextUrl.clone();
      url.pathname = "/seller/login";
      url.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(url);
    }

    if (!sellerRow?.status) {
      const url = request.nextUrl.clone();
      url.pathname = "/seller/onboarding";
      url.search = "";
      return NextResponse.redirect(url);
    }

    const sellerStatus = String(sellerRow.status).toLowerCase();
    if (sellerStatus === "pending" || sellerStatus === "rejected") {
      const url = request.nextUrl.clone();
      url.pathname = "/seller/onboarding";
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (sellerStatus === "suspended") {
      const url = request.nextUrl.clone();
      url.pathname = "/seller/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};