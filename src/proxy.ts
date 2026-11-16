import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

export default function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/transactions/:path*",
    "/accounts/:path*",
    "/categories/:path*",
    "/budgets/:path*",
    "/savings/:path*",
    "/recurring/:path*",
    "/notifications/:path*",
    "/insights/:path*",
    "/reports/:path*",
    "/backup/:path*",
    "/more/:path*",
    "/profile/:path*",
    "/settings/:path*",
  ],
};
