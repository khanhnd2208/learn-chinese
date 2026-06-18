/* ════════════════════════════════════════════════════════════════════════
   rateLimit.ts — In-memory per-user rate limiting (single-instance)
   ════════════════════════════════════════════════════════════════════════ */

interface Bucket {
	count: number;
	resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
	/** Max requests per window */
	limit: number;
	/** Window size in milliseconds */
	windowMs: number;
}

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	resetAt: number;
}

/**
 * Token-bucket rate limit keyed by arbitrary string (typically userId:route).
 * Note: in-memory only — use Redis when running multiple instances.
 */
export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
	const now = Date.now();
	let bucket = buckets.get(key);

	if (!bucket || now >= bucket.resetAt) {
		bucket = { count: 0, resetAt: now + options.windowMs };
		buckets.set(key, bucket);
	}

	bucket.count++;
	const allowed = bucket.count <= options.limit;
	return {
		allowed,
		remaining: Math.max(0, options.limit - bucket.count),
		resetAt: bucket.resetAt,
	};
}

export function rateLimitKey(userId: string, route: string): string {
	return `${userId}:${route}`;
}
