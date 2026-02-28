import { describe, expect, it } from 'vitest';
import {
  ApiError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  UnauthorizedError,
  ValidationError,
} from '@/lib/api/errors';
import { cmsJsonError } from '@/lib/server/cms/http';

describe('cmsJsonError', () => {
  it('formats ValidationError with error, code, and fields', async () => {
    const err = new ValidationError({ email: 'invalid', name: 'required' });
    const response = cmsJsonError(err);

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      fields: { email: 'invalid', name: 'required' },
    });
  });

  it('formats ApiError with error and code', async () => {
    const err = new ApiError('Custom error', 400, 'CUSTOM_ERROR');
    const response = cmsJsonError(err);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Custom error',
      code: 'CUSTOM_ERROR',
    });
  });

  it('formats NotFoundError with code', async () => {
    const err = new NotFoundError('Pet');
    const response = cmsJsonError(err);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: 'Pet not found',
      code: 'NOT_FOUND',
    });
  });

  it('formats UnauthorizedError with code', async () => {
    const err = new UnauthorizedError('Invalid token');
    const response = cmsJsonError(err);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid token',
      code: 'UNAUTHORIZED',
    });
  });

  it('formats ForbiddenError with code', async () => {
    const err = new ForbiddenError('Access denied');
    const response = cmsJsonError(err);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: 'Access denied',
      code: 'FORBIDDEN',
    });
  });

  it('formats ConflictError with code', async () => {
    const err = new ConflictError('Resource already exists');
    const response = cmsJsonError(err);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: 'Resource already exists',
      code: 'CONFLICT',
    });
  });

  it('formats RateLimitError with code', async () => {
    const err = new RateLimitError('Rate limit exceeded');
    const response = cmsJsonError(err);

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: 'Rate limit exceeded',
      code: 'RATE_LIMITED',
    });
  });

  it('handles unknown errors with generic response', async () => {
    const err = new Error('Unexpected error');
    const response = cmsJsonError(err);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Interni chyba serveru',
      code: 'INTERNAL_ERROR',
    });
  });

  it('handles null/undefined errors with generic response', async () => {
    const response1 = cmsJsonError(null);
    const response2 = cmsJsonError(undefined);

    expect(response1.status).toBe(500);
    expect(response2.status).toBe(500);
    await expect(response1.json()).resolves.toEqual({
      error: 'Interni chyba serveru',
      code: 'INTERNAL_ERROR',
    });
    await expect(response2.json()).resolves.toEqual({
      error: 'Interni chyba serveru',
      code: 'INTERNAL_ERROR',
    });
  });

  it('handles ApiError without explicit code', async () => {
    const err = new ApiError('Some error', 500);
    const response = cmsJsonError(err);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Some error',
      code: undefined,
    });
  });
});

