import { NextRequest, NextResponse } from 'next/server';
import { createWriteStream } from 'fs';
import { mkdir, unlink } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import path from 'path';
import { isAdmin } from '@/lib/admin';
import { getFileById, setFileCover, COVERS_DIR } from '@/lib/storage';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_COVER_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminAddress = request.headers.get('x-admin-address');
  if (!isAdmin(adminAddress)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const file = await getFileById(id);
  if (!file) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const formData = await request.formData();
    const coverFile = formData.get('cover') as File | null;
    if (!coverFile) {
      return NextResponse.json({ error: 'No file' }, { status: 400 });
    }
    if (coverFile.size > MAX_COVER_SIZE) {
      return NextResponse.json({ error: 'Cover too large (max 5MB)' }, { status: 400 });
    }
    if (!ALLOWED_IMAGE_TYPES.includes(coverFile.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, GIF, WebP allowed' }, { status: 400 });
    }

    const ext = path.extname(coverFile.name) || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext.toLowerCase()) ? ext : '.jpg';
    const coverFilename = `${id}${safeExt}`;
    const coverPath = `/uploads/covers/${coverFilename}`;
    const fullPath = path.join(COVERS_DIR, coverFilename);

    await mkdir(COVERS_DIR, { recursive: true });

    const oldCover = file.coverPath;
    if (oldCover) {
      const oldFull = path.join(process.cwd(), 'public', oldCover);
      try {
        await unlink(oldFull);
      } catch {
        // ignore
      }
    }

    const webStream = coverFile.stream();
    const nodeReadable = Readable.fromWeb(webStream as import('stream/web').ReadableStream);
    const writeStream = createWriteStream(fullPath);
    await pipeline(nodeReadable, writeStream);

    const updated = await setFileCover(id, coverPath);
    return NextResponse.json(updated);
  } catch (e) {
    console.error('Cover upload error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
