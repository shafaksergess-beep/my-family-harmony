/**
 * Server-side rate limiting for edge functions
 * Prevents abuse by limiting requests per IP/user
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
  blockedUntil?: number;
}

// In-memory store (per edge function instance)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 10; // Max 10 requests per minute
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes block

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (IP address or user ID)
 * @returns Object with isBlocked status and remaining requests
 */
export function checkRateLimit(identifier: string): {
  isBlocked: boolean;
  remainingRequests?: number;
  resetAt?: number;
  blockedUntil?: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // No previous requests
  if (!entry) {
    return { isBlocked: false, remainingRequests: MAX_REQUESTS_PER_WINDOW };
  }

  // Check if currently blocked
  if (entry.blockedUntil && entry.blockedUntil > now) {
    return {
      isBlocked: true,
      blockedUntil: entry.blockedUntil,
    };
  }

  // Check if window has expired
  if (now >= entry.resetAt) {
    // Reset the entry
    rateLimitStore.delete(identifier);
    return { isBlocked: false, remainingRequests: MAX_REQUESTS_PER_WINDOW };
  }

  // Check if max requests reached
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    const blockedUntil = now + BLOCK_DURATION_MS;
    rateLimitStore.set(identifier, { ...entry, blockedUntil });
    return {
      isBlocked: true,
      blockedUntil,
    };
  }

  return {
    isBlocked: false,
    remainingRequests: MAX_REQUESTS_PER_WINDOW - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Record a request
 * @param identifier - Unique identifier (IP address or user ID)
 */
export function recordRequest(identifier: string): void {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return;
  }

  // If window expired, reset
  if (now >= entry.resetAt) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return;
  }

  // Increment count
  rateLimitStore.set(identifier, {
    ...entry,
    count: entry.count + 1,
  });
}

/**
 * Get IP address from request
 * @param req - The request object
 */
export function getIpAddress(req: Request): string {
  // Check various headers for IP address
  const xForwardedFor = req.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }

  const xRealIp = req.headers.get("x-real-ip");
  if (xRealIp) {
    return xRealIp;
  }

  // Fallback to a default
  return "unknown";
}

/**
 * Clean up expired entries to prevent memory leaks
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    // Remove if window expired and not blocked
    if (now >= entry.resetAt && (!entry.blockedUntil || entry.blockedUntil < now)) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
