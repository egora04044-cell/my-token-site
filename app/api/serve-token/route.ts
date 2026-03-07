import { NextRequest, NextResponse } from 'next/server';
import { createServeToken } from '@/lib/serve-token';
import { hasAccess } from '@/lib/access';
import { isAdmin } from '@/lib/admin';

const RATE_LIMIT = 50; // макс токенов на адрес в час
const RATE_WINDOW_MS = 60 * 60 * 1000;
const requestCounts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(address: string): boolean {
  if (isAdmin(address)) return true;
  const now = Date.now();
  const entry = requestCounts.get(address);
  if (!entry) {
    requestCounts.set(address, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (now > entry.resetAt) {
    requestCounts.set(address, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

/** POST — получить токен для доступа к файлу (анти-слив) */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const path = typeof body.path === 'string' ? body.path.trim() : null;
    const address = typeof body.address === 'string' ? body.address.trim() : null;

    if (!path || !path.startsWith('/uploads/') || !address) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    if (!checkRateLimit(address)) {
      return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
    }

    if (!(await hasAccess(address))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const token = createServeToken(path, address);
    return NextResponse.json({ token });
  } catch (e) {
    console.error('Serve token error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
