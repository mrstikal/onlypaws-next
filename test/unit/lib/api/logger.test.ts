import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

async function importLoggerForEnv(env: string) {
  vi.stubEnv('NODE_ENV', env);
  vi.resetModules();
  const mod = await import('@/lib/api/logger');
  return mod.logger;
}

describe('logger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it('logs info in development with readable prefix and payload', async () => {
    const logger = await importLoggerForEnv('development');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    logger.info('Hello dev', { requestId: 'r1' });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const calls = logSpy.mock.calls[0];
    if (!calls || calls.length === 0) throw new Error('No log calls');
    const [firstArg, secondArg] = calls;
    expect(String(firstArg)).toContain('[INFO]');
    expect(String(firstArg)).toContain('Hello dev');
    expect(firstArg).toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(secondArg).toEqual({ requestId: 'r1' });
  });

  it('logs warn in production as JSON string', async () => {
    const logger = await importLoggerForEnv('production');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    logger.warn('Warn prod', { code: 123 });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const calls = logSpy.mock.calls[0];
    if (!calls || calls.length === 0) throw new Error('No log calls');
    const [jsonArg, maybeSecondArg] = calls;
    expect(typeof jsonArg).toBe('string');
    expect(maybeSecondArg).toBeUndefined();

    const parsed = JSON.parse(String(jsonArg));
    expect(parsed).toMatchObject({
      level: 'warn',
      message: 'Warn prod',
      data: { code: 123 },
    });
    expect(parsed.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('maps Error object to error.message in error logs', async () => {
    const logger = await importLoggerForEnv('production');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    logger.error('Crash', new Error('boom'));

    const calls = logSpy.mock.calls[0];
    if (!calls || calls.length === 0) throw new Error('No log calls');
    const [jsonArg] = calls;
    const parsed = JSON.parse(String(jsonArg));
    expect(parsed).toMatchObject({
      level: 'error',
      message: 'Crash',
      data: 'boom',
    });
  });

  it('logs non-Error payload unchanged in error logs', async () => {
    const logger = await importLoggerForEnv('production');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    logger.error('Bad input', { field: 'email' });

    const calls = logSpy.mock.calls[0];
    if (!calls || calls.length === 0) throw new Error('No log calls');
    const [jsonArg] = calls;
    const parsed = JSON.parse(String(jsonArg));
    expect(parsed).toMatchObject({
      level: 'error',
      message: 'Bad input',
      data: { field: 'email' },
    });
  });

  it('does not log debug outside development', async () => {
    const logger = await importLoggerForEnv('test');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    logger.debug('Should not be logged', { silent: true });

    expect(logSpy).not.toHaveBeenCalled();
  });

  it('logs debug in development', async () => {
    const logger = await importLoggerForEnv('development');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    logger.debug('Debug dev', { feature: 'x' });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const calls = logSpy.mock.calls[0];
    if (!calls || calls.length === 0) throw new Error('No log calls');
    const [firstArg, secondArg] = calls;
    expect(String(firstArg)).toContain('[DEBUG]');
    expect(String(firstArg)).toContain('Debug dev');
    expect(secondArg).toEqual({ feature: 'x' });
  });
});

