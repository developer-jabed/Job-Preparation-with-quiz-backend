export const ACCESS_TOKEN_EXPIRES_IN = '1y';
export const REFRESH_TOKEN_EXPIRES_IN = '2y';

export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';

// TTL for the Redis-stored refresh token record, in seconds.
// Keep this in sync with REFRESH_TOKEN_EXPIRES_IN above (2 years).
export const REFRESH_TOKEN_TTL_SECONDS = 2 * 365 * 24 * 60 * 60;

// Redis key prefix — value stored is the userId, so on refresh we confirm
// the *specific* token is still the one on record (not just any token for
// that user), which is what makes logout / revocation actually work.
export const refreshTokenRedisKey = (token: string) => `refresh_token:${token}`;