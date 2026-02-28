import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/auth/me/route';

vi.mock('@/lib/auth', () => ({
  getAuth: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/auth/me', () => {
  it('returns authenticated user data', async () => {
    const mockAuth = {
      isAuthed: true,
      user: {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user' as const,
      },
    } as const;

    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(mockAuth);

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.isAuthed).toBe(true);
    expect(body.user.email).toBe('test@example.com');
  });

  it('returns unauthenticated state', async () => {
    const mockAuth = {
      isAuthed: false,
      user: null,
    } as const;

    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(mockAuth);

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.isAuthed).toBe(false);
    expect(body.user).toBeNull();
  });
});

