import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/pets/[id]/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    pets: {
      findUnique: vi.fn(),
    },
    posts: {
      findMany: vi.fn(),
    },
    comments: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    likes: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    follows: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuth: vi.fn(),
}));

vi.mock('@/utils/mediaUrl', () => ({
  publicUrl: vi.fn((folder, filename) => (filename ? `/media/${folder}/${filename}` : null)),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/pets/[id]', () => {
  const userAuth = {
    isAuthed: true,
    user: { id: '5', name: 'User', email: 'user@example.com', role: 'user' as const },
  } as const;

  it('returns 400 for invalid pet id', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    const req = new Request('http://localhost/api/pets/invalid');
    const res = await GET(req, { params: Promise.resolve({ id: 'invalid' }) });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'Invalid pet id' });
  });

  it('returns 404 when pet does not exist', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    (prisma.pets.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new Request('http://localhost/api/pets/999');
    const res = await GET(req, { params: Promise.resolve({ id: '999' }) });

    expect(res.status).toBe(404);
  });

  it('returns pet detail with owner permissions', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.pets.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10n,
      name: 'Micka',
      bio: 'Friendly dog',
      profile_picture: 'micka.jpg',
      user_id: 5n,
      likes_count: 15,
      comments_count: 3,
      followers_count: 20,
      breeds: { name: 'Labrador', species: 'dog' },
    });

    (prisma.follows.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.likes.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.posts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.comments.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (prisma.comments.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const req = new Request('http://localhost/api/pets/10');
    const res = await GET(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.pet.id).toBe('10');
    expect(body.pet.name).toBe('Micka');
    expect(body.pet.bio).toBe('Friendly dog');
    expect(body.pet.is_owner).toBe(true);
    expect(body.pet.can_follow).toBe(false);
    expect(body.pet.can_like).toBe(false);
    expect(body.pet.breed.name).toBe('Labrador');
    expect(body.isAuthed).toBe(true);
  });

  it('returns pet detail with visitor permissions (unauthenticated)', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    (prisma.pets.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10n,
      name: 'Micka',
      bio: 'Friendly dog',
      profile_picture: 'micka.jpg',
      user_id: 5n,
      likes_count: 15,
      comments_count: 3,
      followers_count: 20,
      breeds: { name: 'Labrador', species: 'dog' },
    });

    (prisma.posts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.comments.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (prisma.comments.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const req = new Request('http://localhost/api/pets/10');
    const res = await GET(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.pet.is_owner).toBe(false);
    expect(body.pet.can_follow).toBe(false);
    expect(body.pet.can_like).toBe(false);
    expect(body.isAuthed).toBe(false);
    expect(body.currentUserId).toBeNull();
  });

  it('returns pet with posts and comments', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue(userAuth);

    (prisma.pets.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10n,
      name: 'Micka',
      bio: 'Friendly dog',
      profile_picture: 'micka.jpg',
      user_id: 99n,
      likes_count: 15,
      comments_count: 3,
      followers_count: 20,
      breeds: { name: 'Labrador', species: 'dog' },
    });

    (prisma.follows.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.likes.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    (prisma.posts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 100n,
        caption: 'Beautiful day',
        media_url: 'post1.jpg',
        media_type: 'image/jpeg',
        likes_count: 10,
        comments_count: 2,
        is_premium: false,
        created_at: new Date('2026-03-01'),
        pet: { name: 'Micka' },
        subscription_tiers: null,
      },
    ]);

    (prisma.comments.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);

    // Mock for rootsPage (IDs only)
    (prisma.comments.findMany as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ id: 50n }])
      // Mock for rootRows (full data)
      .mockResolvedValueOnce([
        {
          id: 50n,
          body: 'Great pet!',
          likes_count: 2,
          created_at: new Date('2026-03-02'),
          parent_id: null,
          user: { id: 6n, name: 'CommenterUser' },
        },
      ])
      // Mock for childRows (no children in this test)
      .mockResolvedValueOnce([]);

    (prisma.likes.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const req = new Request('http://localhost/api/pets/10');
    const res = await GET(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.posts).toHaveLength(1);
    expect(body.posts[0].id).toBe('100');
    expect(body.posts[0].caption).toBe('Beautiful day');

    expect(body.comments).toHaveLength(1);
    expect(body.comments[0].body).toBe('Great pet!');
    expect(body.commentsPagination.total).toBe(1);
  });

  it('respects staff role restrictions (cannot like or follow)', async () => {
    const { getAuth } = await import('@/lib/auth');
    const adminAuth = {
      isAuthed: true,
      user: { id: '1', name: 'Admin', email: 'admin@example.com', role: 'admin' as const },
    } as const;
    vi.mocked(getAuth).mockResolvedValue(adminAuth);

    (prisma.pets.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10n,
      name: 'Micka',
      bio: 'Friendly dog',
      profile_picture: 'micka.jpg',
      user_id: 99n,
      likes_count: 15,
      comments_count: 0,
      followers_count: 20,
      breeds: { name: 'Labrador', species: 'dog' },
    });

    (prisma.follows.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.likes.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.posts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.comments.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (prisma.comments.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const req = new Request('http://localhost/api/pets/10');
    const res = await GET(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.pet.can_follow).toBe(false);
    expect(body.pet.can_like).toBe(false);
  });

  it('handles pet without breed', async () => {
    const { getAuth } = await import('@/lib/auth');
    vi.mocked(getAuth).mockResolvedValue({ isAuthed: false, user: null });

    (prisma.pets.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 10n,
      name: 'UnknownPet',
      bio: null,
      profile_picture: null,
      user_id: 99n,
      likes_count: 0,
      comments_count: 0,
      followers_count: 0,
      breeds: null,
    });

    (prisma.posts.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.comments.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (prisma.comments.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const req = new Request('http://localhost/api/pets/10');
    const res = await GET(req, { params: Promise.resolve({ id: '10' }) });

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.pet.breed).toBeNull();
    expect(body.pet.bio).toBeNull();
  });
});

