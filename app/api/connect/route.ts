import { NextRequest, NextResponse } from 'next/server';
import { addConnectedAddress } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const address = body?.address;
    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }
    // Базовая валидация Solana адреса (32-44 символа base58)
    if (address.length < 32 || address.length > 44) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }
    await addConnectedAddress(address);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Connect API error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
