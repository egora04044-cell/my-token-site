import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import { getConnectedAddresses } from '@/lib/storage';

export async function GET(request: NextRequest) {
  const adminAddress = request.headers.get('x-admin-address');
  if (!isAdmin(adminAddress)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const addresses = await getConnectedAddresses();
    return NextResponse.json(addresses);
  } catch (e) {
    console.error('Addresses API error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
