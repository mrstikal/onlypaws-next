import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/posts/[id]/route';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    posts: {
      findUnique: vi.fn(),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/posts/[id]', () => {
  it('returns 400 for invalid post ID', async () => {
    const req = new Request('http://localhost/api/posts/invalid');
    const res = await GET(req, { params: Promise.resolve({ id: 'invalid' }) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Neplatné ID');
  });

  it('returns 404 when post not found', async () => {
    (prisma.posts.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new Request('http://localhost/api/posts/999');
    const res = await GET(req, { params: Promise.resolve({ id: '999' }) });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toContain('nenalezen');
  });

  it('returns post details for valid ID', async () => {
    (prisma.posts.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 123n,
      caption: 'Beautiful sunset',
      media_url: '/posts/123.jpg',
      media_type: 'image/jpeg',
      is_premium: false,
      likes_count: 15,
      comments_count: 3,
      created_at: new Date('2026-03-01'),
      pet: { id: 10n, name: 'Micka' },
      subscription_tiers: null,
    });

    const req = new Request('http://localhost/api/posts/123');
    const res = await GET(req, { params: Promise.resolve({ id: '123' }) });

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.post.id).toBe('123');
    expect(body.post.caption).toBe('Beautiful sunset');
    expect(body.post.likes_count).toBe(15);
    expect(body.post.is_premium).toBe(false);
    expect(body.post.pet.name).toBe('Micka');
    expect(body.post.required_tier).toBeNull();
  });

  it('returns premium post with tier info', async () => {
    (prisma.posts.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 456n,
      caption: 'Premium content',
      media_url: '/posts/456.jpg',
      media_type: 'image/jpeg',
      is_premium: true,
      likes_count: 5,
      comments_count: 1,
      created_at: new Date('2026-03-02'),
      pet: { id: 20n, name: 'Alik' },
      subscription_tiers: { id: 2n, name: 'Basic', slug: 'basic' },
    });

    const req = new Request('http://localhost/api/posts/456');
    const res = await GET(req, { params: Promise.resolve({ id: '456' }) });

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.post.is_premium).toBe(true);
    expect(body.post.required_tier.name).toBe('Basic');
    expect(body.post.required_tier.slug).toBe('basic');
  });

  it('handles posts without pet', async () => {
    (prisma.posts.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 789n,
      caption: 'Test post',
      media_url: '/posts/789.jpg',
      media_type: 'image/jpeg',
      is_premium: false,
      likes_count: 0,
      comments_count: 0,
      created_at: null,
      pet: null,
      subscription_tiers: null,
    });

    const req = new Request('http://localhost/api/posts/789');
    const res = await GET(req, { params: Promise.resolve({ id: '789' }) });

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.post.pet).toBeNull();
    expect(body.post.created_at).toBeNull();
  });
});

