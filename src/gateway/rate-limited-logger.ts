/**
 * Rate-limited logger helper.
 *
 * Emits a given structured log line at most once per window per key, so that
 * WAHA replay storms or repeated cache misses don't flood production logs.
 * Returns true if the line was emitted on this call, false if it was suppressed.
 *
 * Usage:
 *   rateLimitedLog(sessionId, "[Webhook] dedup-hit", 10_000)
 *   // → emits "[Webhook] dedup-hit sessionId=default" at most once per 10s
 *     per sessionId
 *
 * The window default is 10 seconds. The emit function defaults to console.log.
 */

const DEFAULT_WINDOW_MS = 10_000;

const lastEmittedAt: Map<string, number> = new Map();

export function rateLimitedLog(
	key: string,
	line: string,
	windowMs: number = DEFAULT_WINDOW_MS,
	emit: (line: string) => void = console.log,
): boolean {
	const now = Date.now();
	const last = lastEmittedAt.get(key);
	if (last !== undefined && now - last < windowMs) return false;
	lastEmittedAt.set(key, now);
	emit(line);
	return true;
}

export function _resetRateLimitedLogForTests(): void {
	lastEmittedAt.clear();
}
