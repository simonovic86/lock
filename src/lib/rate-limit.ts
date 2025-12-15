/**
 * Simple in-memory rate limiter
 * 
 * Tracks requests per IP address with automatic cleanup.
 * Rate limits reset on server restart (acceptable for serverless).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory storage for rate limit tracking
const rateLimitMap = new Map<string, RateLimitEntry>();

// Cleanup interval (10 minutes)
const CLEANUP_INTERVAL = 10 * 60 * 1000;

// Default configuration
const DEFAULT_MAX_REQUESTS = 5;
const DEFAULT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Start the cleanup timer (runs automatically on first use)
 */
function ensureCleanupTimer() {
  if (cleanupTimer) return;
  
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap.entries()) {
      if (entry.resetAt <= now) {
        rateLimitMap.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
  
  // Don't prevent Node.js from exiting
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

interface RateLimitOptions {
  /** Maximum requests allowed in the time window */
  maxRequests?: number;
  /** Time window in milliseconds */
  windowMs?: number;
}

interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of requests made in current window */
  current: number;
  /** Maximum requests allowed */
  limit: number;
  /** Seconds until the rate limit resets */
  resetInSeconds: number;
}

/**
 * Check if a request should be rate limited
 * 
 * @param identifier - Unique identifier (usually IP address)
 * @param options - Rate limit configuration
 * @returns Whether the request is allowed and current usage info
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {},
): RateLimitResult {
  ensureCleanupTimer();
  
  const maxRequests = options.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const now = Date.now();
  
  // Get or create entry
  let entry = rateLimitMap.get(identifier);
  
  // Reset if window expired
  if (!entry || entry.resetAt <= now) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
    };
  }
  
  // Check if allowed
  const allowed = entry.count < maxRequests;
  
  // Increment counter if allowed
  if (allowed) {
    entry.count++;
    rateLimitMap.set(identifier, entry);
  }
  
  return {
    allowed,
    current: entry.count,
    limit: maxRequests,
    resetInSeconds: Math.ceil((entry.resetAt - now) / 1000),
  };
}

/**
 * Get rate limit headers for HTTP response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': Math.max(0, result.limit - result.current).toString(),
    'X-RateLimit-Reset': result.resetInSeconds.toString(),
  };
}

