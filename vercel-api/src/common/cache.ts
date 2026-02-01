import { clampValue } from "./fmt.js";

/**
 * Common cache TTL values in seconds.
 */
export const CACHE_TTL = {
  STATS: 14400, // 4 hours
  LANGS: 21600, // 6 hours
  GRAPH: 7200, // 2 hours
  STREAK: 3600, // 1 hour
  ERROR: 600, // 10 minutes
};

/**
 * Common durations in seconds.
 */
export const DURATIONS = {
  ONE_MINUTE: 60,
  TEN_MINUTES: 600,
  ONE_HOUR: 3600,
  ONE_DAY: 86400,
};

/**
 * Response object interface (Vercel serverless function response).
 */
interface Response {
  setHeader(name: string, value: string): void;
}

/**
 * Disables caching by setting appropriate headers on the response object.
 *
 * @param res - The response object.
 */
function disableCaching(res: Response): void {
  res.setHeader(
    "Cache-Control",
    "no-cache, no-store, must-revalidate, max-age=0, s-maxage=0"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

/**
 * Sets the Cache-Control headers on the response object.
 *
 * @param res - The response object.
 * @param seconds - The cache seconds to set.
 */
export function setCacheHeaders(res: Response, seconds: number): void {
  if (seconds < 1 || process.env.NODE_ENV === "development") {
    disableCaching(res);
    return;
  }

  res.setHeader(
    "Cache-Control",
    `max-age=${seconds}, s-maxage=${seconds}, stale-while-revalidate=${DURATIONS.ONE_DAY}`
  );
}

/**
 * Sets the Cache-Control headers for error responses.
 *
 * @param res - The response object.
 */
export function setErrorCacheHeaders(res: Response): void {
  const envCacheSeconds = process.env.CACHE_SECONDS
    ? parseInt(process.env.CACHE_SECONDS, 10)
    : NaN;

  if (
    (!isNaN(envCacheSeconds) && envCacheSeconds < 1) ||
    process.env.NODE_ENV === "development"
  ) {
    disableCaching(res);
    return;
  }

  res.setHeader(
    "Cache-Control",
    `max-age=${CACHE_TTL.ERROR}, s-maxage=${CACHE_TTL.ERROR}, stale-while-revalidate=${DURATIONS.ONE_DAY}`
  );
}

/**
 * Resolves the cache seconds based on the requested, default, min, and max values.
 *
 * @param params - The parameters object.
 * @returns The resolved cache seconds.
 */
export function resolveCacheSeconds(params: {
  requested: number;
  defaultValue: number;
  min: number;
  max: number;
}): number {
  const { requested, defaultValue, min, max } = params;
  let cacheSeconds = clampValue(
    isNaN(requested) ? defaultValue : requested,
    min,
    max
  );

  if (process.env.CACHE_SECONDS) {
    const envCacheSeconds = parseInt(process.env.CACHE_SECONDS, 10);
    if (!isNaN(envCacheSeconds)) {
      cacheSeconds = envCacheSeconds;
    }
  }

  return cacheSeconds;
}
