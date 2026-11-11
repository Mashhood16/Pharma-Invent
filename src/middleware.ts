import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "pharma_invent_super_secure_secret_key_2026_at_least_32_chars!"
);

// Routes requiring ADMIN role
const ADMIN_ONLY_ROUTES = [
  "/financials",
  "/purchases",
  "/suppliers",
  "/admin",
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

    // If on /login and already logged in, redirect to POS or Dashboard
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/pos", request.url));
    }

    // Role-based access control (RBAC): Cashier is restricted from admin routes
    if (role === "CASHIER") {
      const isRestricted = ADMIN_ONLY_ROUTES.some((route) =>
        pathname.startsWith(route)
      );
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
