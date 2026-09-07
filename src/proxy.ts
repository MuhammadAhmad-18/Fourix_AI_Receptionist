import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Edge runtime: cheap JWT cookie presence check + redirect only. No DB
// access, no argon2/Prisma here (those are Node-only and would break Edge
// bundling) — permission checks happen in the route handler/service layer,
// which is the actual authorization boundary.
export default async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  const isLoggedIn = !!token;
  const isAuthPage = req.nextUrl.pathname.startsWith("/login");

  if (!isLoggedIn && !isAuthPage) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
