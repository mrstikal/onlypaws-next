import type { TierSlug } from '@/types';

const TIER_SLUGS: readonly TierSlug[] = ['free', 'basic', 'vip', 'ultra'];

export function parseTierSlug(value: unknown): TierSlug | null {
  return TIER_SLUGS.includes(value as TierSlug) ? (value as TierSlug) : null;
}

export function trimToString(value: unknown): string {
  return String(value ?? '').trim();
}

export function hasLength(text: string, min: number, max: number): boolean {
  return text.length >= min && text.length <= max;
}

