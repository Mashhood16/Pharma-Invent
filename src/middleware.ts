import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "pharma_invent_super_secure_secret_key_2026_at_least_32_chars!"
);

// Routes requiring at least ADMIN role
const ADMIN_ONLY_ROUTES = [
  "/financials",
  "/purchases",
  "/suppliers",
  "/settings",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files, api routes (except protected), and public assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/favicon.ico" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("pharma_session")?.value;

  // If not logged in and not on /login, redirect to /login
  if (!token) {
    if (pathname === "/login") {
      return NextResponse.next();
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify token
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    const role = (payload as { role?: string }).role;

    // If on /login and already logged in, redirect based on role
    if (pathname === "/login") {
      const destination = role === "SUPER_ADMIN" ? "/super-admin" : "/pos";
      return NextResponse.redirect(new URL(destination, request.url));
    }

    // Root redirect
    if (pathname === "/") {
      const destination = role === "SUPER_ADMIN" ? "/super-admin" : "/pos";
      return NextResponse.redirect(new URL(destination, request.url));
    }

    // Strictly protect /super-admin
    if (pathname.startsWith("/super-admin") && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/pos?error=unauthorized", request.url));
    }

    // Cashier restrictions
    if (role === "CASHIER") {
      const isRestricted =
        pathname.startsWith("/super-admin") ||
        ADMIN_ONLY_ROUTES.some((route) => pathname.startsWith(route));

      if (isRestricted) {
        return NextResponse.redirect(new URL("/pos?error=unauthorized", request.url));
      }
    }

    return NextResponse.next();
  } catch {
    // If token is invalid or expired, clear and send to login
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("pharma_session");
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
