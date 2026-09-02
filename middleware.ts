import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const path = req.nextUrl.pathname;

  // Build public-facing origin from proxy headers (behind nginx)
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.nextUrl.host;
  const base = `${proto}://${host}`;

  if (path.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/auth/login', base));
  }

  if (path.startsWith('/admin')) {
    if (!token) return NextResponse.redirect(new URL('/auth/login', base));
    if (token.role !== 'admin') return NextResponse.redirect(new URL('/auth/login', base));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};