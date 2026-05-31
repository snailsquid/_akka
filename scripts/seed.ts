#!/usr/bin/env bun
/**
 * Database seed — ensures a default WAHA contact exists.
 *
 * Every WAHA instance starts with a "default" session that needs a matching
 * contact record in the database so the webhook handler can route messages.
 * This script detects the session and seeds the contact row if missing.
 *
 * Idempotent — safe to run on every startup.
 */

import { Database } from "bun:sqlite";
import { mkdirSync } from "fs";

const WAHA_BASE_URL = process.env.WAHA_BASE_URL || "http://localhost:3001";
const WAHA_API_KEY = process.env.WAHA_API_KEY || "";
const SESSION_ID = "default";
const CONTACT_NAME = process.env.WAHA_CONTACT_NAME || "Akka Bot";

async function main() {
	// 1. Open DB (same path as src/db/index.ts)
	mkdirSync("./data", { recursive: true });
	const db = new Database("./data/akka.db");
	db.exec("PRAGMA journal_mode = WAL");
	db.exec("PRAGMA foreign_keys = ON");

	// 2. Check if contact already exists
	const existing = db
		.query("SELECT id, phone_number FROM contacts WHERE waha_session_id = ?")
		.get(SESSION_ID) as { id: number; phone_number: string } | undefined;

	if (existing) {
		console.log(
			`[seed] Contact already exists: id=${existing.id}, phone=${existing.phone_number}`,
		);
		db.close();
		return;
	}

	// 3. Fetch WAHA session info to get the phone number
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (WAHA_API_KEY) {
		headers["X-API-Key"] = WAHA_API_KEY;
	}

	let phoneNumber = "6282128383086"; // fallback
	let sessionMe: { id?: string; pushName?: string } | null = null;

	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 10000);

		const response = await fetch(
			`${WAHA_BASE_URL}/api/sessions/${SESSION_ID}`,
			{
				headers,
				signal: controller.signal,
			},
		);
		clearTimeout(timeout);

		if (response.ok) {
			const data = (await response.json()) as {
				me?: { id?: string; pushName?: string };
				status?: string;
			};
			sessionMe = data.me ?? null;

			if (sessionMe?.id) {
				// Extract phone number from JID (e.g. "6282128383086@c.us" → "6282128383086")
				phoneNumber = sessionMe.id.replace(/@.*$/, "");
				console.log(`[seed] WAHA session status: ${data.status ?? "unknown"}`);
				console.log(`[seed] Detected phone: ${phoneNumber}`);
			}
		} else {
			console.warn(
				`[seed] WAHA session check returned ${response.status} — using fallback phone`,
			);
		}
	} catch (err) {
		console.warn(
			`[seed] Could not reach WAHA at ${WAHA_BASE_URL} — using fallback phone`,
		);
	}

	// 4. Insert contact
	const pushName = sessionMe?.pushName ?? CONTACT_NAME;
	db.run(
		"INSERT INTO contacts (name, phone_number, waha_session_id) VALUES (?, ?, ?)",
		[pushName, phoneNumber, SESSION_ID],
	);

	const inserted = db
		.query("SELECT id FROM contacts WHERE waha_session_id = ?")
		.get(SESSION_ID) as { id: number };

	console.log(
		`[seed] Created default contact: id=${inserted.id}, name=${pushName}, phone=${phoneNumber}`,
	);

	// Insert a developer record if none exists (for the bot owner)
	const devExists = db.query("SELECT id FROM developers LIMIT 1").get();
	if (!devExists) {
		db.run("INSERT INTO developers (username, whatsapp_jid) VALUES (?, ?)", [
			"akka-bot",
			`${phoneNumber}@c.us`,
		]);
		console.log(`[seed] Created default developer: akka-bot`);
	}

	db.close();
}

main().catch((err) => {
	console.error("[seed] Fatal error:", err);
	process.exit(1);
});
