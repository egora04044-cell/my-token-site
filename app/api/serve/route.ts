import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { UPLOADS_DIR } from '@/lib/storage';
import { verifyServeToken } from '@/lib/serve-token';

/** Прокси для раздачи файлов — токен только в заголовках (не в URL, нельзя шарить ссылку) */
export async function GET(request: NextRequest) {
  const pathParam = request.nextUrl.searchParams.get('path');
  const token = request.headers.get('x-serve-token');
  const address = request.headers.get('x-serve-address');

  if (!pathParam || !pathParam.startsWith('/uploads/')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  if (!token || !address || !verifyServeToken(pathParam, address, token)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const fullPath = path.join(process.cwd(), 'public', pathParam);
    const normalizedPath = path.normalize(fullPath);
    const uploadsDir = path.normalize(UPLOADS_DIR);

    if (!normalizedPath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const stat = await fs.stat(normalizedPath);
    if (!stat.isFile()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const content = await fs.readFile(normalizedPath);
    const ext = path.extname(pathParam).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4',
      '.flac': 'audio/flac',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
    };
    const mime = mimeTypes[ext] || 'application/octet-stream';

    return new NextResponse(content, {
      headers: {
        'Content-Type': mime,
        'Content-Length': stat.size.toString(),
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error('Serve file error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
