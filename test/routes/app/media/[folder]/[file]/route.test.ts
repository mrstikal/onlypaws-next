import { beforeEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { GET } from '@/app/media/[folder]/[file]/route';

describe('GET /media/[folder]/[file]', () => {
  beforeEach(() => {
    // no-op: each test manages its own files
  });

  it('returns 400 for unsupported folder', async () => {
    const res = await GET(new Request('http://localhost/media/other/file.jpg'), {
      params: Promise.resolve({ folder: 'other', file: 'file.jpg' }),
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: 'Invalid path' });
  });

  it('returns 400 for unsafe file segment', async () => {
    const res = await GET(new Request('http://localhost/media/pets/../secret.jpg'), {
      params: Promise.resolve({ folder: 'pets', file: '../secret.jpg' }),
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: 'Invalid path' });
  });

  it('returns 404 when file is not found', async () => {
    const res = await GET(new Request('http://localhost/media/pets/missing.jpg'), {
      params: Promise.resolve({ folder: 'pets', file: 'missing.jpg' }),
    });

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: 'Not found' });
  });

  it('returns binary response with image content-type and cache-control', async () => {
    const folderPath = path.join(process.cwd(), 'storage', 'media', 'pets');
    const filePath = path.join(folderPath, 'cat.jpg');

    await mkdir(folderPath, { recursive: true });
    await writeFile(filePath, Buffer.from([1, 2, 3]));

    const res = await GET(new Request('http://localhost/media/pets/cat.jpg'), {
      params: Promise.resolve({ folder: 'pets', file: 'cat.jpg' }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/jpeg');
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');

    await rm(filePath, { force: true });
  });

  it('falls back to octet-stream for unknown extension', async () => {
    const folderPath = path.join(process.cwd(), 'storage', 'media', 'posts');
    const filePath = path.join(folderPath, 'file.unknownext');

    await mkdir(folderPath, { recursive: true });
    await writeFile(filePath, Buffer.from([9, 9, 9]));

    const res = await GET(new Request('http://localhost/media/posts/file.unknownext'), {
      params: Promise.resolve({ folder: 'posts', file: 'file.unknownext' }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/octet-stream');

    await rm(filePath, { force: true });
  });
});
