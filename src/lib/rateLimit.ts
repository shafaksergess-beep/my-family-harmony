/**
 * Client-side rate limiting for authentication attempts
 * Prevents brute force attacks by limiting login/signup attempts
 */

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  blockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const MAX_ATTEMPTS = 5; // Maximum attempts allowed
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes window
const BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes block duration

/**
 * Check if an identifier (email/IP) is rate limited
 * @param identifier - The identifier to check (email address or IP)
 * @returns Object with isBlocked status and remaining time if blocked
 */
export function checkRateLimit(identifier: string): {
  isBlocked: boolean;
  remainingTime?: number;
  attemptsRemaining?: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // No previous attempts
  if (!entry) {
    return { isBlocked: false, attemptsRemaining: MAX_ATTEMPTS };
  }

  // Check if currently blocked
  if (entry.blockedUntil && entry.blockedUntil > now) {
    return {
      isBlocked: true,
      remainingTime: Math.ceil((entry.blockedUntil - now) / 1000),
    };
  }

  // Check if window has expired
  if (now - entry.firstAttempt > WINDOW_MS) {
    // Reset the entry
    rateLimitStore.delete(identifier);
    return { isBlocked: false, attemptsRemaining: MAX_ATTEMPTS };
  }

  // Check if max attempts reached
  if (entry.attempts >= MAX_ATTEMPTS) {
    const blockedUntil = now + BLOCK_DURATION_MS;
    rateLimitStore.set(identifier, { ...entry, blockedUntil });
    return {
      isBlocked: true,
      remainingTime: Math.ceil(BLOCK_DURATION_MS / 1000),
    };
  }

  return {
    isBlocked: false,
    attemptsRemaining: MAX_ATTEMPTS - entry.attempts,
  };
}

/**
 * Record an authentication attempt
 * @param identifier - The identifier to record (email address or IP)
 */
export function recordAttempt(identifier: string): void {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry) {
    rateLimitStore.set(identifier, {
      attempts: 1,
      firstAttempt: now,
    });
    return;
  }

  // If window expired, reset
  if (now - entry.firstAttempt > WINDOW_MS) {
    rateLimitStore.set(identifier, {
      attempts: 1,
      firstAttempt: now,
    });
    return;
  }

  // Increment attempts
  rateLimitStore.set(identifier, {
    ...entry,
    attempts: entry.attempts + 1,
  });
}

/**
 * Reset rate limit for an identifier (e.g., after successful auth)
 * @param identifier - The identifier to reset
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Clean up expired entries to prevent memory leaks
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    // Remove if window expired and not blocked
    if (now - entry.firstAttempt > WINDOW_MS && (!entry.blockedUntil || entry.blockedUntil < now)) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
}
