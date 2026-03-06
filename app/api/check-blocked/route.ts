import { NextRequest, NextResponse } from 'next/server';
import { isBlocked } from '@/lib/blocked';

/** POST — проверить, заблокирован ли адрес. Тело: { address: string } */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const address = typeof body.address === 'string' ? body.address.trim() : null;
    if (!address) {
      return NextResponse.json({ blocked: false });
    }
    const blocked = await isBlocked(address);
    return NextResponse.json({ blocked });
  } catch (e) {
    console.error('Check blocked error:', e);
    return NextResponse.json({ blocked: false });
  }
}
