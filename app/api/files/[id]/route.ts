import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/admin';
import { deleteUploadedFile, renameUploadedFile } from '@/lib/storage';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminAddress = _request.headers.get('x-admin-address');
  if (!isAdmin(adminAddress)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  try {
    const ok = await deleteUploadedFile(id);
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Delete file API error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminAddress = request.headers.get('x-admin-address');
  if (!isAdmin(adminAddress)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  try {
    const body = await request.json();
    const newName = typeof body.name === 'string' ? body.name.trim() : '';
    if (!newName) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const file = await renameUploadedFile(id, newName);
    if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(file);
  } catch (e) {
    console.error('Rename file API error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
