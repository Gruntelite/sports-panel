
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Continue without locale-based redirection
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip all internal paths (_next, etc.)
    '/((?!api|_next/static|_next/image|assets|favicon.ico|sw.js).*)'
  ],
};
