import 'server-only';

/**
 * Environment variables validation
 * Validates required environment variables at startup
 */

const requiredEnvVars = [
  'DATABASE_URL',
] as const;

type OptionalEnvVar = 'NODE_ENV' | 'NEXT_PUBLIC_APP_URL' | 'CRON_SECRET';

type RequiredEnvVar = typeof requiredEnvVars[number];

/**
 * Validate that all required environment variables are set
 * @throws Error if any required env var is missing
 */
export function validateEnv(): void {
  const missing: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map(v => `  - ${v}`).join('\n')}\n\n` +
      `Please check your .env file or environment configuration.`
    );
  }
}

/**
 * Get a required environment variable
 * @param key - Environment variable key
 * @returns The environment variable value
 * @throws Error if the variable is not set
 */
export function getRequiredEnv(key: RequiredEnvVar): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Get an optional environment variable with a default value
 * @param key - Environment variable key
 * @param defaultValue - Default value if not set
 * @returns The environment variable value or default
 */
export function getOptionalEnv(key: OptionalEnvVar, defaultValue: string = ''): string {
  return process.env[key] ?? defaultValue;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

// Validate environment on module load (server-side only)
if (typeof window === 'undefined') {
  validateEnv();
}

