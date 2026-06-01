/**
 * In-memory TTL-bounded dedup store for webhook messageIds.
 *
 * Goal: suppress duplicate WAHA webhook events identified by
 * (sessionId, messageId) within a configurable TTL window. When WAHA replays
 * buffered events on session reconnect, each replay would otherwise produce a
 * fresh outbound reply.
 *
 * The TTL is configurable via DEDUP_TTL_MS (default 10 minutes). Eviction is
 * lazy on read and complemented by a periodic full sweep started by
 * startSweep(). State is in-memory only; restarts lose dedup history, which is
 * acceptable because replays happen within minutes of the original delivery.
 */

const DEFAULT_TTL_MS = 600_000; // 10 minutes
const DEFAULT_SWEEP_INTERVAL_MS = 60_000; // 1 minute

export class DedupStore {
	private readonly entries: Map<string, Map<string, number>> = new Map();
	private readonly ttlMs: number;
	private sweepTimer: ReturnType<typeof setInterval> | null = null;

	constructor(ttlMs: number = parseTtl()) {
		this.ttlMs = ttlMs;
	}

	getTtlMs(): number {
		return this.ttlMs;
	}

	/**
	 * Check whether (sessionId, messageId) was marked within the TTL window.
	 * Lazy-evicts the sessionId sub-map when fully expired. Accepts an
	 * optional `now` for deterministic tests.
	 */
	has(sessionId: string, messageId: string, now: number = Date.now()): boolean {
		const perSession = this.entries.get(sessionId);
		if (!perSession) return false;

		const expiresAt = perSession.get(messageId);
		if (expiresAt === undefined) return false;

		if (expiresAt <= now) {
			perSession.delete(messageId);
			if (perSession.size === 0) this.entries.delete(sessionId);
			return false;
		}
		return true;
	}

	/**
	 * Mark (sessionId, messageId) as seen for the TTL window. A re-mark refreshes
	 * the expiry.
	 */
	mark(sessionId: string, messageId: string): void {
		let perSession = this.entries.get(sessionId);
		if (!perSession) {
			perSession = new Map();
			this.entries.set(sessionId, perSession);
		}
		perSession.set(messageId, Date.now() + this.ttlMs);
	}

	/**
	 * Remove all expired entries. Called periodically by startSweep.
	 */
	sweep(now: number = Date.now()): number {
		let removed = 0;
		for (const [sessionId, perSession] of this.entries) {
			for (const [messageId, expiresAt] of perSession) {
				if (expiresAt <= now) {
					perSession.delete(messageId);
					removed++;
				}
			}
			if (perSession.size === 0) this.entries.delete(sessionId);
		}
		return removed;
	}

	/**
	 * Start the periodic full sweep. Idempotent — calling again is a no-op.
	 */
	startSweep(intervalMs: number = DEFAULT_SWEEP_INTERVAL_MS): void {
		if (this.sweepTimer) return;
		this.sweepTimer = setInterval(() => this.sweep(), intervalMs);
		// Don't keep the process alive solely for the sweep timer.
		if (typeof this.sweepTimer.unref === "function") this.sweepTimer.unref();
	}

	stopSweep(): void {
		if (this.sweepTimer) {
			clearInterval(this.sweepTimer);
			this.sweepTimer = null;
		}
	}

	clear(): void {
		this.entries.clear();
	}

	size(): number {
		let total = 0;
		for (const perSession of this.entries.values()) total += perSession.size;
		return total;
	}
}

function parseTtl(): number {
	const raw = process.env.DEDUP_TTL_MS;
	if (!raw) return DEFAULT_TTL_MS;
	const n = Number(raw);
	if (!Number.isFinite(n) || n <= 0) return DEFAULT_TTL_MS;
	return n;
}

export const dedupStore = new DedupStore();
