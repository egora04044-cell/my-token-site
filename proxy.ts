import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const EXCLUSIVE_SUBDOMAIN = 'exclusive.nextuplabel.online';

export function proxy(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const url = request.nextUrl;

  // На поддомене exclusive — корень / ведёт на /exclusive
  if (host.startsWith(EXCLUSIVE_SUBDOMAIN) && url.pathname === '/') {
    return NextResponse.redirect(new URL('/exclusive', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/',
};
