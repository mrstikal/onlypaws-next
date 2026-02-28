import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/auth/logout/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    sessions: {
      delete: vi.fn(),
    },
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      get: vi.fn((name: string) => {
        if (name === 'op_session') {
          return { value: 'test-session-id' };
        }
        return undefined;
      }),
    })
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/auth/logout', () => {
  it('deletes session from database', async () => {
    (prisma.sessions.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const res = await POST();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);

    expect(prisma.sessions.delete).toHaveBeenCalledWith({
      where: { id: 'test-session-id' },
    });
  });

  it('clears session cookie', async () => {
    (prisma.sessions.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const res = await POST();
    const setCookie = res.headers.get('set-cookie');

    expect(setCookie).toContain('op_session=');
    expect(setCookie).toContain('Max-Age=0');
  });

  it('handles missing session gracefully', async () => {
    const mockCookies = {
      get: vi.fn(() => undefined),
      has: vi.fn(() => false),
      size: 0,
      getAll: vi.fn(() => []),
      [Symbol.iterator]: vi.fn(() => [][Symbol.iterator]()),
      delete: vi.fn(),
      set: vi.fn(),
    } satisfies Partial<Record<string, unknown>>;

    const headers = await import('next/headers');
    vi.mocked(headers.cookies).mockResolvedValue(mockCookies as unknown as Awaited<ReturnType<typeof headers.cookies>>);

    const res = await POST();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('handles database error gracefully', async () => {
    (prisma.sessions.delete as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Database error')
    );

    const res = await POST();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});

