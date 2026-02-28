import { beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
import path from 'node:path';
import { stat, unlink } from 'node:fs/promises';
import { POST } from '@/app/api/cms/uploads/posts/route';
import { config } from '@/lib/config';

vi.mock('@/lib/auth', () => ({
  getAuth: vi.fn(),
}));

describe('POST /api/cms/uploads/posts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null } as const);

    const req = new Request('http://localhost/api/cms/uploads/posts', { method: 'POST' });
    const res = await POST(req);

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ ok: false });
  });

  it('returns 400 when file is missing', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({
      isAuthed: true,
      user: { id: '1', name: 'U', email: 'u@example.com', role: 'user' },
    } as const);

    const form = new FormData();
    const req = {
      formData: vi.fn().mockResolvedValue(form),
    } as unknown as Request;

    const res = await POST(req);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ ok: false, error: 'Missing file' });
  });

  it('returns 400 when file is too large for post upload', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({
      isAuthed: true,
      user: { id: '1', name: 'U', email: 'u@example.com', role: 'user' },
    } as const);

    const tooLarge = new Uint8Array(config.upload.maxBytes + 1);
    const form = new FormData();
    form.set('file', new File([tooLarge], 'post.jpg', { type: 'image/jpeg' }));

    const req = {
      formData: vi.fn().mockResolvedValue(form),
    } as unknown as Request;

    const res = await POST(req);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ ok: false, error: 'Soubor je příliš velký' });
  });

  it('returns 400 for unsupported mime type', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({
      isAuthed: true,
      user: { id: '1', name: 'U', email: 'u@example.com', role: 'user' },
    } as const);

    const form = new FormData();
    form.set('file', new File([new Uint8Array([1, 2, 3])], 'post.txt', { type: 'text/plain' }));

    const req = {
      formData: vi.fn().mockResolvedValue(form),
    } as unknown as Request;

    const res = await POST(req);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ ok: false, error: 'Nepodporovaný typ souboru' });
  });

  it('stores post media and returns response with mediaType', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({
      isAuthed: true,
      user: { id: '1', name: 'U', email: 'u@example.com', role: 'user' },
    } as const);

    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1700000000100);
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('87654321-4321-4321-4321-210987654321');

    const fileBytes = new Uint8Array([5, 6, 7]);
    const file = new File([fileBytes], 'post.webp', { type: 'image/webp' });
    (file as unknown as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer = vi
      .fn()
      .mockResolvedValue(fileBytes.buffer);

    const form = new FormData();
    form.set('file', file);

    const req = {
      formData: vi.fn().mockResolvedValue(form),
    } as unknown as Request;

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      fileName: '1700000000100_87654321-4321-4321-4321-210987654321.webp',
      mediaType: 'image',
    });

    const outPath = path.join(process.cwd(), 'storage', 'media', 'posts', body.fileName);
    await expect(stat(outPath)).resolves.toBeDefined();
    await unlink(outPath);

    nowSpy.mockRestore();
    uuidSpy.mockRestore();
  });
});

