/**
 * Application-wide constants.
 * Avoid magic strings/numbers scattered across codebase.
 */
export const APP_CONSTANTS = {
  /** Injection token for Redis client */
  REDIS_CLIENT: 'REDIS_CLIENT',

  /** Cookie name for storing refresh token (HttpOnly) */
  REFRESH_TOKEN_COOKIE: 'refresh_token',

  /** Default pagination values */
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,

  /** Salt rounds for bcrypt */
  BCRYPT_SALT_ROUNDS: 12,
} as const;
