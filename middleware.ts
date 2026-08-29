import { NextRequest, NextResponse } from "next/server";

const participantRoutes = ["/home", "/profile", "/photo", "/card", "/scan", "/my_qr", "/my-qr"];

export function middleware(request: NextRequest) {
  const protectedRoute = participantRoutes.some((route) => request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(`${route}/`));
  if (protectedRoute && !request.cookies.has("htb_session")) {
    const url = request.nextUrl.clone();
    url.pathname = "/enter";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/home/:path*", "/profile/:path*", "/photo/:path*", "/card/:path*", "/scan/:path*", "/my_qr/:path*", "/my-qr/:path*"],
};
