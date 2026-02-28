import { describe, expect, it } from 'vitest';
import {
  errorResponse,
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
  validationErrors,
} from '@/lib/apiResponse';

describe('apiResponse helpers', () => {
  it('builds error response with status', async () => {
    const res = errorResponse('Bad input', 400);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ ok: false, error: 'Bad input' });
  });

  it('builds validation response with 422', async () => {
    const res = validationErrors({ email: 'required' });
    expect(res.status).toBe(422);
    await expect(res.json()).resolves.toEqual({ ok: false, errors: { email: 'required' } });
  });

  it('builds success response with merged payload', async () => {
    const res = successResponse({ item: { id: '1' } });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, item: { id: '1' } });
  });

  it('builds unauthorized and not found responses', async () => {
    const unauthorized = unauthorizedResponse('No auth');
    const notFound = notFoundResponse('Missing');

    expect(unauthorized.status).toBe(401);
    expect(notFound.status).toBe(404);

    await expect(unauthorized.json()).resolves.toEqual({ ok: false, error: 'No auth' });
    await expect(notFound.json()).resolves.toEqual({ ok: false, error: 'Missing' });
  });
});

