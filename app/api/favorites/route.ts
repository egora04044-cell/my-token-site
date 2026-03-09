import { NextRequest, NextResponse } from 'next/server';
import { getFavorites, addFavorite, removeFavorite } from '@/lib/favorites';

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address');
  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 });
  }
  try {
    const list = await getFavorites(address);
    return NextResponse.json(list);
  } catch (e) {
    console.error('Favorites GET error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, path: filePath } = body;
    if (!address || !filePath) {
      return NextResponse.json({ error: 'address and path required' }, { status: 400 });
    }
    const list = await addFavorite(address, filePath);
    return NextResponse.json(list);
  } catch (e) {
    console.error('Favorites POST error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, path: filePath } = body;
    if (!address || !filePath) {
      return NextResponse.json({ error: 'address and path required' }, { status: 400 });
    }
    const list = await removeFavorite(address, filePath);
    return NextResponse.json(list);
  } catch (e) {
    console.error('Favorites DELETE error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
