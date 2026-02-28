// src/app/media/[folder]/[file]/route.ts
import { NextResponse } from 'next/server';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

export const runtime = 'nodejs';

function isSafeSegment(s: string) {
  return /^[a-zA-Z0-9._-]+$/.test(s);
}

function contentTypeFromExt(file: string) {
  const ext = file.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'mp4') return 'video/mp4';
  if (ext === 'webm') return 'video/webm';
  return 'application/octet-stream';
}

export async function GET(_req: Request, ctx: { params: Promise<{ folder: string; file: string }> }) {
  const { folder, file } = await ctx.params;

  if ((folder !== 'pets' && folder !== 'posts') || !isSafeSegment(file)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), 'storage', 'media', folder, file);

  try {
    const bytes = await readFile(filePath);
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'content-type': contentTypeFromExt(file),
        'cache-control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}