import { NextRequest, NextResponse } from 'next/server';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import path from 'path';
import { isAdmin } from '@/lib/admin';
import { addUploadedFile, UPLOADS_DIR, FileCategory } from '@/lib/storage';

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'audio/mpeg',
  'audio/wav',
  'video/mp4',
  'video/webm',
  'application/pdf',
];

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_CATEGORIES: FileCategory[] = ['tracks', 'videos', 'community', 'tickets', 'other'];

export async function POST(request: NextRequest) {
  const adminAddress = request.headers.get('x-admin-address');
  if (!isAdmin(adminAddress)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }

    let category = (formData.get('category') as string | null) ?? 'other';
    if (!ALLOWED_CATEGORIES.includes(category as FileCategory)) {
      category = 'other';
    }

    await mkdir(UPLOADS_DIR, { recursive: true });
    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(UPLOADS_DIR, safeName);
    const webStream = file.stream();
    const nodeReadable = Readable.fromWeb(webStream as import('stream/web').ReadableStream);
    const writeStream = createWriteStream(filePath);
    await pipeline(nodeReadable, writeStream);

    const savedPath = `/uploads/${safeName}`;
    const uploaded = await addUploadedFile(file.name, savedPath, file.size, category as FileCategory);
    return NextResponse.json(uploaded);
  } catch (e) {
    console.error('Upload API error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
