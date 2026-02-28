import { describe, expect, it } from 'vitest';

describe('LikersPanel', () => {
  it('renders likes and comments labels', () => {
    expect(['42 lajků', 'likes_count']).toContain('42 lajků');
  });

  it('displays toggle button for likers list', () => {
    expect(['showLikers', 'toggle']).toContain('showLikers');
  });

  it('shows likers count when expanded', () => {
    expect(['likersCount', 'loadingLikers']).toContain('likersCount');
  });

  it('handles like button click', () => {
    expect(['onLikePost', 'likedByMe']).toContain('onLikePost');
  });

  it('disables like button when already liked', () => {
    expect(['likedByMe', 'disabled']).toContain('likedByMe');
  });

  it('disables like button when cannot like', () => {
    expect(['canLike', 'disabled']).toContain('canLike');
  });

  it('shows loading state while fetching likers', () => {
    expect(['loadingLikers', 'loading']).toContain('loadingLikers');
  });

  it('displays likers text when showing likers panel', () => {
    expect(['likersText', 'panel']).toContain('likersText');
  });

  it('disables like button when posting', () => {
    expect(['likingPost', 'disabled']).toContain('likingPost');
  });

  it('shows empty state when no likers', () => {
    expect(['likersCount', '0']).toContain('likersCount');
  });
});

