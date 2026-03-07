import { NextResponse } from 'next/server';

/** Простая проверка что API работает */
export async function GET() {
  return NextResponse.json({ ok: true, time: new Date().toISOString() });
}
