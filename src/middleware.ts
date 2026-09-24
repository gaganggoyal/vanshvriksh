import { NextRequest, NextResponse } from "next/server";
import { readSessionToken } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await readSessionToken(req.cookies.get("vv_session")?.value);
  const gated =
    pathname.startsWith("/tree") ||
    pathname.startsWith("/matches") ||
    pathname.startsWith("/find") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/welcome");

  if (gated && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/tree/:path*", "/find/:path*", "/matches/:path*", "/settings/:path*", "/onboarding/:path*", "/welcome/:path*"],
};
