import { db, schema } from "../db";
import { WahaClient } from "./waha-client";

const wahaApiKey = process.env.WAHA_API_KEY;
const webhookUrl = process.env.WAHA_WEBHOOK_URL;

export interface SessionInfo {
	contactId: number;
	sessionId: string;
	client: WahaClient;
	isHealthy: boolean;
}

/**
 * SessionManager - Manages WhatsApp session health monitoring
 * Periodically checks the status of all WAHA sessions
 */
export class SessionManager {
	private readonly baseUrl: string;
	private readonly sessions: Map<string, SessionInfo> = new Map();
	private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
	private readonly checkIntervalMs: number;

	constructor(baseUrl: string, checkIntervalMs: number = 60000) {
		this.baseUrl = baseUrl;
		this.checkIntervalMs = checkIntervalMs;
	}

	/**
	 * Initialize session manager by loading all contacts from the database
	 */
	async initialize(): Promise<void> {
		try {
			const contacts = db.select().from(schema.contacts).all();

			for (const contact of contacts) {
				const client = new WahaClient(this.baseUrl, contact.wahaSessionId);
				this.sessions.set(contact.wahaSessionId, {
					contactId: contact.id,
					sessionId: contact.wahaSessionId,
					client,
					isHealthy: false,
				});
			}

			console.log(
				`[SessionManager] Initialized with ${this.sessions.size} sessions`,
			);

			// Initial health check
			await this.checkAllSessions();
		} catch (error) {
			console.error("[SessionManager] Failed to initialize:", error);
		}
	}

	/**
	 * Start the health check loop
	 */
	start(): void {
		if (this.healthCheckInterval) {
			console.log("[SessionManager] Already running");
			return;
		}

		console.log(
			`[SessionManager] Starting health check loop (every ${this.checkIntervalMs}ms)`,
		);

		this.healthCheckInterval = setInterval(async () => {
			await this.checkAllSessions();
		}, this.checkIntervalMs);

		// Run immediately
		this.checkAllSessions();
	}

	/**
	 * Stop the health check loop
	 */
	stop(): void {
		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
			this.healthCheckInterval = null;
			console.log("[SessionManager] Health check loop stopped");
		}
	}

	/**
	 * Get the client for a specific session
	 */
	getClient(sessionId: string): WahaClient | undefined {
		return this.sessions.get(sessionId)?.client;
	}

	/**
	 * Get the contact ID for a session
	 */
	getContactId(sessionId: string): number | undefined {
		return this.sessions.get(sessionId)?.contactId;
	}

	/**
	 * Get session info for a session
	 */
	getSessionInfo(sessionId: string): SessionInfo | undefined {
		return this.sessions.get(sessionId);
	}

	/**
	 * Get all sessions
	 */
	getAllSessions(): SessionInfo[] {
		return Array.from(this.sessions.values());
	}

	/**
	 * Check health of all sessions
	 */
	private async checkAllSessions(): Promise<void> {
		const checks = Array.from(this.sessions.entries()).map(
			async ([sessionId, info]) => {
				try {
					const isHealthy = await info.client.checkHealth();
					const wasHealthy = info.isHealthy;
					info.isHealthy = isHealthy;

					if (!isHealthy && wasHealthy) {
						console.log(
							`[SessionManager] Session ${sessionId} is now DISCONNECTED`,
						);
					} else if (isHealthy && !wasHealthy) {
						console.log(
							`[SessionManager] Session ${sessionId} is now CONNECTED`,
						);
					}
				} catch (error) {
					console.error(
						`[SessionManager] Health check error for ${sessionId}:`,
						error,
					);
					info.isHealthy = false;
				}
			},
		);

		await Promise.all(checks);
	}

	/**
	 * Add a new session dynamically
	 */
	addSession(contactId: number, sessionId: string): void {
		if (this.sessions.has(sessionId)) {
			console.log(`[SessionManager] Session ${sessionId} already exists`);
			return;
		}

		const client = new WahaClient(this.baseUrl, sessionId);
		this.sessions.set(sessionId, {
			contactId,
			sessionId,
			client,
			isHealthy: false,
		});

		console.log(
			`[SessionManager] Added new session ${sessionId} for contact ${contactId}`,
		);
	}

	/**
	 * Remove a session
	 */
	removeSession(sessionId: string): void {
		if (this.sessions.delete(sessionId)) {
			console.log(`[SessionManager] Removed session ${sessionId}`);
		}
	}
}

// Singleton instance
let sessionManagerInstance: SessionManager | null = null;

/**
 * Get or create the singleton SessionManager instance
 */
export function getSessionManager(baseUrl?: string): SessionManager {
	if (!sessionManagerInstance && baseUrl) {
		sessionManagerInstance = new SessionManager(baseUrl);
	}
	if (!sessionManagerInstance) {
		throw new Error(
			"SessionManager not initialized. Provide baseUrl on first call.",
		);
	}
	return sessionManagerInstance;
}

/**
 * Initialize the SessionManager with a base URL
 */
export function initSessionManager(
	baseUrl: string,
	checkIntervalMs?: number,
): SessionManager {
	sessionManagerInstance = new SessionManager(baseUrl, checkIntervalMs);
	return sessionManagerInstance;
}
