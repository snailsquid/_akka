import { WahaClient } from "./waha-client";

/**
 * Process-wide registry of WahaClient instances, keyed by sessionId.
 *
 * Goal: ensure exactly one WahaClient per sessionId for the lifetime of the
 * process, so the 500ms serial send queue is per-session and not per-instance.
 *
 * Construction must go through setClient() so the cache is the single source of
 * truth — callers should not call `new WahaClient(...)` directly when a cached
 * client is appropriate.
 */
class ClientCache {
	private readonly clients: Map<string, WahaClient> = new Map();

	getClient(sessionId: string): WahaClient | undefined {
		return this.clients.get(sessionId);
	}

	setClient(sessionId: string, client: WahaClient): void {
		this.clients.set(sessionId, client);
	}

	removeClient(sessionId: string): boolean {
		return this.clients.delete(sessionId);
	}

	clear(): void {
		this.clients.clear();
	}

	size(): number {
		return this.clients.size;
	}
}

export const clientCache = new ClientCache();
