import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cookies, headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getAuth, getRequestMeta, SESSION_COOKIE_NAME } from '@/lib/auth';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
  headers: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    sessions: {
      findUnique: vi.fn(),
    },
    users: {
      findUnique: vi.fn(),
    },
  },
}));

function mockCookies(sessionId: string | null) {
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn().mockImplementation((name: string) => {
      if (name !== SESSION_COOKIE_NAME || !sessionId) return undefined;
      return { value: sessionId };
    }),
  } as never);
}

describe('getAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unauthenticated state when session cookie is missing', async () => {
    mockCookies(null);

    const auth = await getAuth();

    expect(auth).toEqual({ isAuthed: false, user: null });
    expect(prisma.sessions.findUnique).not.toHaveBeenCalled();
    expect(prisma.users.findUnique).not.toHaveBeenCalled();
  });

  it('returns unauthenticated state when session is not found', async () => {
    mockCookies('session-1');
    vi.mocked(prisma.sessions.findUnique).mockResolvedValue(null);

    const auth = await getAuth();

    expect(prisma.sessions.findUnique).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      select: { id: true, user_id: true },
    });
    expect(auth).toEqual({ isAuthed: false, user: null });
    expect(prisma.users.findUnique).not.toHaveBeenCalled();
  });

  it('returns unauthenticated state when user is not found', async () => {
    mockCookies('session-2');
    vi.mocked(prisma.sessions.findUnique).mockResolvedValue({
      id: 2n,
      user_id: 22n,
    } as never);
    vi.mocked(prisma.users.findUnique).mockResolvedValue(null);

    const auth = await getAuth();

    expect(prisma.users.findUnique).toHaveBeenCalledWith({
      where: { id: 22n },
      select: { id: true, name: true, email: true, role: true },
    });
    expect(auth).toEqual({ isAuthed: false, user: null });
  });

  it('returns authenticated user and keeps admin role', async () => {
    mockCookies('session-3');
    vi.mocked(prisma.sessions.findUnique).mockResolvedValue({
      id: 3n,
      user_id: 33n,
    } as never);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({
      id: 33n,
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
    } as never);

    const auth = await getAuth();

    expect(auth).toEqual({
      isAuthed: true,
      user: {
        id: '33',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
      },
    });
  });

  it('maps unknown user role to user', async () => {
    mockCookies('session-4');
    vi.mocked(prisma.sessions.findUnique).mockResolvedValue({
      id: 4n,
      user_id: 44n,
    } as never);
    vi.mocked(prisma.users.findUnique).mockResolvedValue({
      id: 44n,
      name: 'Regular User',
      email: 'user@example.com',
      role: 'guest',
    } as never);

    const auth = await getAuth();

    expect(auth).toEqual({
      isAuthed: true,
      user: {
        id: '44',
        name: 'Regular User',
        email: 'user@example.com',
        role: 'user',
      },
    });
  });
});

describe('getRequestMeta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns first forwarded IP and user-agent', async () => {
    vi.mocked(headers).mockResolvedValue({
      get: vi.fn().mockImplementation((name: string) => {
        if (name === 'x-forwarded-for') return '203.0.113.1, 10.0.0.1';
        if (name === 'user-agent') return 'Vitest Agent';
        return null;
      }),
    } as never);

    const meta = await getRequestMeta();

    expect(meta).toEqual({ ip: '203.0.113.1', userAgent: 'Vitest Agent' });
  });

  it('returns null values when headers are missing', async () => {
    vi.mocked(headers).mockResolvedValue({
      get: vi.fn().mockReturnValue(null),
    } as never);

    const meta = await getRequestMeta();

    expect(meta).toEqual({ ip: null, userAgent: null });
  });
});

