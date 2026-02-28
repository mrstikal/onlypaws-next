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

describe('ApiError classes', () => {
  it('creates base ApiError with defaults', () => {
    const err = new ApiError('Oops');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ApiError');
    expect(err.status).toBe(500);
    expect(err.code).toBeUndefined();
  });

  it('creates ValidationError with fields and metadata', () => {
    const err = new ValidationError({ email: 'invalid' });
    expect(err).toBeInstanceOf(ApiError);
    expect(err.name).toBe('ValidationError');
    expect(err.status).toBe(422);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.fields.email).toBe('invalid');
  });

  it('creates NotFoundError with resource name', () => {
    const err = new NotFoundError('Pet');
    expect(err.message).toBe('Pet not found');
    expect(err.status).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
  });

  it('creates Unauthorized/Forbidden/Conflict/RateLimit errors', () => {
    expect(new UnauthorizedError().status).toBe(401);
    expect(new ForbiddenError().status).toBe(403);
    expect(new ConflictError().status).toBe(409);
    expect(new RateLimitError().status).toBe(429);
  });
});

