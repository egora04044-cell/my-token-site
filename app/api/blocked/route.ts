import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import {
  getBlockedAddresses,
  addBlockedAddress,
  removeBlockedAddress,
} from '@/lib/blocked';

const headers = (req: NextRequest) => ({
  admin: req.headers.get('x-admin-address') ?? '',
});

/** GET — список заблокированных (только админ) */
export async function GET(request: NextRequest) {
  const adminAddress = headers(request).admin;
  if (!isAdmin(adminAddress)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const blocked = await getBlockedAddresses();
    return NextResponse.json(blocked);
  } catch (e) {
    console.error('Blocked GET error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** POST — добавить адрес в блок-лист (только админ) */
export async function POST(request: NextRequest) {
  const adminAddress = headers(request).admin;
  if (!isAdmin(adminAddress)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const address = typeof body.address === 'string' ? body.address.trim() : null;
    if (!address || address.length < 32) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }
    await addBlockedAddress(address);
    const blocked = await getBlockedAddresses();
    return NextResponse.json(blocked);
  } catch (e) {
    console.error('Blocked POST error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** DELETE — убрать адрес из блок-листа (только админ) */
export async function DELETE(request: NextRequest) {
  const adminAddress = headers(request).admin;
  if (!isAdmin(adminAddress)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }
    await removeBlockedAddress(address);
    const blocked = await getBlockedAddresses();
    return NextResponse.json(blocked);
  } catch (e) {
    console.error('Blocked DELETE error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
