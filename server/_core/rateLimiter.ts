/**
 * Simple In-Memory Rate Limiter for Authentication Procedures
 */

type LimitRecord = {
  timestamps: number[];
};

const store = new Map<string, LimitRecord>();

// Clean up old records periodically (every 10 minutes)
setInterval(() => {
  const now = Date.now();
  store.forEach((record, key) => {
    // Keep only timestamps within the last 1 hour
    const filtered = record.timestamps.filter(
      (ts: number) => now - ts < 3600000
    );
    if (filtered.length === 0) {
      store.delete(key);
    } else {
      record.timestamps = filtered;
    }
  });
}, 600000);

/**
 * Check if a request exceeds the limit
 * @param key unique identifier (e.g. IP + endpoint, or email)
 * @param maxRequests max allowed requests in the window
 * @param windowMs window duration in milliseconds
 * @returns boolean true if allowed, false if rate limited
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  let record = store.get(key);

  if (!record) {
    record = { timestamps: [] };
    store.set(key, record);
  }

  // Filter timestamps within the current window
  record.timestamps = record.timestamps.filter(ts => now - ts < windowMs);

  if (record.timestamps.length >= maxRequests) {
    const oldestInWindow = record.timestamps[0];
    const retryAfter = Math.ceil((oldestInWindow + windowMs - now) / 1000);
    return { allowed: false, retryAfter };
  }

  record.timestamps.push(now);
  return { allowed: true, retryAfter: 0 };
}
