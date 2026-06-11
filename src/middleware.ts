import { NextResponse, type NextRequest } from "next/server";

const CUID_PATTERN = /^c[a-z0-9]{24,}$/i;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const match = pathname.match(/^\/properties\/([^/]+)$/);
  if (!match) return NextResponse.next();

  const segment = match[1];
  if (!segment || CUID_PATTERN.test(segment)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/public-properties/${segment}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/properties/:path*"],
};
