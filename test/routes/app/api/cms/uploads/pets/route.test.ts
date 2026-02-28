import { beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
import path from 'node:path';
import { stat, unlink } from 'node:fs/promises';
import { POST } from '@/app/api/cms/uploads/pets/route';

vi.mock('@/lib/auth', () => ({
  getAuth: vi.fn(),
}));

describe('POST /api/cms/uploads/pets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null } as const);

    const req = new Request('http://localhost/api/cms/uploads/pets', { method: 'POST' });
    const res = await POST(req);

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ ok: false });
  });

  it('returns 400 when formData is invalid', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({
      isAuthed: true,
      user: { id: '1', name: 'U', email: 'u@example.com', role: 'user' },
    } as const);

    const req = {
      formData: vi.fn().mockRejectedValue(new Error('invalid form data')),
    } as unknown as Request;

    const res = await POST(req);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ ok: false, error: 'Neplatná data' });
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

  it('returns 400 when file is empty', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({
      isAuthed: true,
      user: { id: '1', name: 'U', email: 'u@example.com', role: 'user' },
    } as const);

    const form = new FormData();
    form.set('file', new File([], 'avatar.jpg', { type: 'image/jpeg' }));

    const req = {
      formData: vi.fn().mockResolvedValue(form),
    } as unknown as Request;

    const res = await POST(req);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ ok: false, error: 'File is empty' });
  });

  it('returns 400 when avatar is too large', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({
      isAuthed: true,
      user: { id: '1', name: 'U', email: 'u@example.com', role: 'user' },
    } as const);

    const tooLarge = new Uint8Array(10 * 1024 * 1024 + 1);
    const form = new FormData();
    form.set('file', new File([tooLarge], 'avatar.jpg', { type: 'image/jpeg' }));

    const req = {
      formData: vi.fn().mockResolvedValue(form),
    } as unknown as Request;

    const res = await POST(req);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      ok: false,
      error: 'Soubor je příliš velký (max 10 MB)',
    });
  });

  it('returns 400 when mime type is not supported', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({
      isAuthed: true,
      user: { id: '1', name: 'U', email: 'u@example.com', role: 'user' },
    } as const);

    const form = new FormData();
    form.set('file', new File([new Uint8Array([1, 2, 3])], 'doc.pdf', { type: 'application/pdf' }));

    const req = {
      formData: vi.fn().mockResolvedValue(form),
    } as unknown as Request;

    const res = await POST(req);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ ok: false, error: 'Nepodporovaný typ souboru' });
  });

  it('stores file and returns deterministic fileName for valid upload', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({
      isAuthed: true,
      user: { id: '1', name: 'U', email: 'u@example.com', role: 'user' },
    } as const);

    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
    const uuidSpy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('12345678-1234-1234-1234-123456789012');

    const fileBytes = new Uint8Array([10, 20, 30]);
    const file = new File([fileBytes], 'avatar.png', { type: 'image/png' });
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
    expect(body).toEqual({ ok: true, fileName: '1700000000000_12345678-1234-1234-1234-123456789012.png' });

    const outPath = path.join(process.cwd(), 'storage', 'media', 'pets', body.fileName);
    await expect(stat(outPath)).resolves.toBeDefined();
    await unlink(outPath);

    nowSpy.mockRestore();
    uuidSpy.mockRestore();
  });
});

