// src/app/api/cms/uploads/posts/route.ts
import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { unauthorizedResponse, errorResponse } from '@/lib/apiResponse';
import { config } from '@/lib/config';

export const runtime = 'nodejs';


function extFromMime(mime: string) {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return null;
}

export async function POST(req: Request) {
  const auth = await getAuth();
  if (!auth.isAuthed) return unauthorizedResponse();

  const form = await req.formData().catch(() => null);
  if (!form) return errorResponse('Neplatná data');

  const file = form.get('file');
  if (!(file instanceof File)) return errorResponse('Missing file');

  if (file.size <= 0) return errorResponse('File is empty');
  if (file.size > config.upload.maxBytes) return errorResponse('Soubor je příliš velký');

  const mime = String(file.type || '').toLowerCase();
  const ext = extFromMime(mime);
  if (!ext) return errorResponse('Nepodporovaný typ souboru');

  const bytes = Buffer.from(await file.arrayBuffer());
  const fileName = `${Date.now()}_${crypto.randomUUID()}.${ext}`;

  const outDir = path.join(process.cwd(), 'storage', 'media', 'posts');
  await mkdir(outDir, { recursive: true });

  await writeFile(path.join(outDir, fileName), bytes);

  return NextResponse.json({
    ok: true,
    fileName, // save to DB in posts.media_url
    mediaType: 'image',
  });
}