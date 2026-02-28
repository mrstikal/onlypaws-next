import { describe, expect, it, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/auth/register/route';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    sessions: {
      create: vi.fn(),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  hash: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getRequestMeta: vi.fn(() => Promise.resolve({ ip: '127.0.0.1', userAgent: 'test-agent' })),
  SESSION_COOKIE_NAME: 'op_session',
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/auth/register', () => {
  const validPayload = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    password_confirmation: 'password123',
  };

  it('returns 422 when required fields are missing', async () => {
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: '', email: '', password: '' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(422);

    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.errors.name).toBeTruthy();
    expect(body.errors.email).toBeTruthy();
    expect(body.errors.password).toBeTruthy();
  });

  it('returns 422 when password is too short', async () => {
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        ...validPayload,
        password: '1234567',
        password_confirmation: '1234567',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(422);

    const body = await res.json();
    expect(body.errors.password).toContain('alespoň 8 znaků');
  });

  it('returns 422 when passwords do not match', async () => {
    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        ...validPayload,
        password_confirmation: 'different',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(422);

    const body = await res.json();
    expect(body.errors.password_confirmation).toContain('neshodují');
  });

  it('returns 409 when email already exists', async () => {
    (prisma.users.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1n });

    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(409);

    const body = await res.json();
    expect(body.errors.email).toContain('už existuje');
  });

  it('creates user, session and returns user data on success', async () => {
    (prisma.users.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (hash as ReturnType<typeof vi.fn>).mockResolvedValue('$2b$10$hashedpassword');
    (prisma.users.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1n,
      name: 'Test User',
      email: 'test@example.com',
    });
    (prisma.sessions.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.user.name).toBe('Test User');
    expect(body.user.email).toBe('test@example.com');

    expect(hash).toHaveBeenCalledWith('password123', 10);
    expect(prisma.users.create).toHaveBeenCalled();
    expect(prisma.sessions.create).toHaveBeenCalled();
  });

  it('sets httpOnly session cookie on successful registration', async () => {
    (prisma.users.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (hash as ReturnType<typeof vi.fn>).mockResolvedValue('$2b$10$hashedpassword');
    (prisma.users.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1n,
      name: 'Test User',
      email: 'test@example.com',
    });
    (prisma.sessions.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const req = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(validPayload),
    });

    const res = await POST(req);
    const setCookie = res.headers.get('set-cookie');

    expect(setCookie).toContain('op_session=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=lax');
  });
});

