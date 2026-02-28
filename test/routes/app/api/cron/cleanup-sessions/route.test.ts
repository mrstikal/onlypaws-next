import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/cron/cleanup-sessions/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    sessions: {
      deleteMany: vi.fn(),
    },
  },
}));

const originalEnv = process.env;

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...originalEnv, NODE_ENV: 'production', CRON_SECRET: 'test-secret' } as unknown as NodeJS.ProcessEnv;
});

afterEach(() => {
  process.env = originalEnv;
});

describe('GET /api/cron/cleanup-sessions', () => {
  it('returns 401 when CRON_SECRET is missing in production', async () => {
    process.env = { ...originalEnv, NODE_ENV: 'production', CRON_SECRET: '' } as unknown as NodeJS.ProcessEnv;

    const req = new Request('http://localhost/api/cron/cleanup-sessions', {
      headers: { authorization: 'Bearer invalid' },
    });

    const res = await GET(req);
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ error: 'CRON_SECRET is not configured' });
  });

  it('returns 401 when authorization header is missing in production', async () => {
    const req = new Request('http://localhost/api/cron/cleanup-sessions', {
      headers: {},
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ error: 'Unauthorized' });
  });

  it('returns 401 when authorization bearer token is incorrect', async () => {
    const req = new Request('http://localhost/api/cron/cleanup-sessions', {
      headers: { authorization: 'Bearer wrong-secret' },
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ error: 'Unauthorized' });
  });

  it('deletes old sessions when authorized with correct CRON_SECRET', async () => {
    (prisma.sessions.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 5 });

    const req = new Request('http://localhost/api/cron/cleanup-sessions', {
      headers: { authorization: 'Bearer test-secret' },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.deleted).toBe(5);
    expect(body.message).toBe('Deleted 5 old sessions');

    expect(prisma.sessions.deleteMany).toHaveBeenCalledWith({
      where: {
        last_activity: { lt: expect.any(Number) },
      },
    });
  });

  it('returns success with 0 deleted sessions', async () => {
    (prisma.sessions.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });

    const req = new Request('http://localhost/api/cron/cleanup-sessions', {
      headers: { authorization: 'Bearer test-secret' },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.deleted).toBe(0);
  });

  it('returns 500 when database operation fails', async () => {
    (prisma.sessions.deleteMany as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Database connection lost')
    );

    const req = new Request('http://localhost/api/cron/cleanup-sessions', {
      headers: { authorization: 'Bearer test-secret' },
    });

    const res = await GET(req);
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toBe('Cleanup failed');
    expect(body.message).toBe('Database connection lost');
  });

  it('skips authorization in development mode', async () => {
    process.env = { ...originalEnv, NODE_ENV: 'development', CRON_SECRET: 'test-secret' } as unknown as NodeJS.ProcessEnv;

    (prisma.sessions.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 2 });

    const req = new Request('http://localhost/api/cron/cleanup-sessions', {
      headers: {}, // No authorization header in development
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.deleted).toBe(2);
  });

  it('uses correct 30-day cutoff timestamp', async () => {
    (prisma.sessions.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 3 });

    const req = new Request('http://localhost/api/cron/cleanup-sessions', {
      headers: { authorization: 'Bearer test-secret' },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    // @ts-expect-error Accessing mock internals for testing
    const callArgs = (prisma.sessions.deleteMany as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const expectedCutoff = nowInSeconds - thirtyDaysInSeconds;

    // Allow some tolerance for test execution time
    expect(callArgs.where.last_activity.lt).toBeCloseTo(expectedCutoff, 0);
  });
});

