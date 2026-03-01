import { NextResponse } from 'next/server';
import { getUploadedFiles } from '@/lib/storage';

/** Публичный список загруженных файлов — для отображения в эксклюзивной зоне */
export async function GET() {
  try {
    const files = await getUploadedFiles();
    return NextResponse.json(files);
  } catch (e) {
    console.error('Public files API error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
