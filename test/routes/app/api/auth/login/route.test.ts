import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/auth/login/route';
import { prisma } from '@/lib/prisma';
import { compare } from 'bcryptjs';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
    },
    sessions: {
      create: vi.fn(),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  compare: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getRequestMeta: vi.fn(() => Promise.resolve({ ip: '127.0.0.1', userAgent: 'test-agent' })),
  SESSION_COOKIE_NAME: 'op_session',
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/auth/login', () => {
  it('returns 422 when email or password is missing', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: '', password: '' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(422);

    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.errors.email).toBeTruthy();
    expect(body.errors.password).toBeTruthy();
  });

  it('returns 422 when user not found', async () => {
    (prisma.users.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'nonexistent@example.com', password: 'password' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(422);

    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.errors.email).toContain('Neplatné přihlašovací údaje');
  });

  it('returns 422 when password is incorrect', async () => {
    (prisma.users.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1n,
      name: 'Test User',
      email: 'user@example.com',
      password: '$2b$10$hashedpassword',
    });

    (compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com', password: 'wrongpassword' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(422);

    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.errors.email).toContain('Neplatné přihlašovací údaje');
  });

  it('creates session and returns user on successful login', async () => {
    (prisma.users.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1n,
      name: 'Test User',
      email: 'user@example.com',
      password: '$2b$10$hashedpassword',
    });

    (compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.sessions.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com', password: 'correctpassword' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.user.email).toBe('user@example.com');
    expect(body.user.name).toBe('Test User');

    expect(prisma.sessions.create).toHaveBeenCalled();
  });

  it('sets httpOnly session cookie on successful login', async () => {
    (prisma.users.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1n,
      name: 'Test User',
      email: 'user@example.com',
      password: '$2b$10$hashedpassword',
    });

    (compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.sessions.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com', password: 'correctpassword', remember: true }),
    });

    const res = await POST(req);
    const setCookie = res.headers.get('set-cookie');

    expect(setCookie).toContain('op_session=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=lax');
  });
});

