import { NextResponse, type NextRequest } from "next/server";

import { isAccessConfigured, verifyAccessToken } from "@/lib/auth";

/**
 * Staff routes are gated here; guest invitation links are not.
 *
 * Everything in this application is staff-only except /i/:token, which is the
 * link recipients receive by email and must open without an account. Gating in
 * middleware rather than per-page means a new staff page is protected by
 * default -- the safer direction to be wrong in.
 */

const PUBLIC_PREFIXES = ["/i/", "/_next/", "/__vinext", "/brand/"];
const PUBLIC_FILES = ["/favicon.svg", "/og.png", "/file.svg", "/globe.svg", "/window.svg"];

function isPublic(pathname: string) {
  return (
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    PUBLIC_FILES.includes(pathname)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // Local development runs without Cloudflare in front, so there is no
  // assertion to verify. `import.meta.env.DEV` is replaced at build time with a
  // literal false, so this branch is not merely unreachable in production -- it
  // is not present in the deployed bundle at all, and no environment variable
  // can switch it back on.
  if (import.meta.env.DEV && !isAccessConfigured()) {
    return NextResponse.next();
  }

  const user = await verifyAccessToken(request.headers.get("cf-access-jwt-assertion"));

  if (!user) {
    // Deliberately terse, and deliberately not a redirect: Cloudflare Access
    // sits in front of this Worker and does its own sign-in. Reaching here means
    // either Access is not configured for this hostname or the request bypassed
    // it, and in both cases the honest answer is to refuse.
    return new NextResponse(
      "This area is for PossAbilities staff. If you have an invitation, please use the link in your email.",
      { status: 403, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
