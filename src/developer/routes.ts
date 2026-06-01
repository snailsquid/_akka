import { Hono } from "hono";
import { db, schema } from "../db";
import { eq } from "drizzle-orm";
import { commandRegistry } from "../commands/registry";

interface DeveloperContext {
	developerId: number;
	developerUsername: string;
}

export const developerRoutes = new Hono<{ Variables: DeveloperContext }>();

// ---- Session-based auth middleware ----
function bearerAuth(c: any, next: any) {
	const auth = c.req.header("Authorization") || "";
	if (!auth.startsWith("Bearer "))
		return c.json({ error: "Unauthorized" }, 401);
	const token = auth.slice(7);
	if (!token) return c.json({ error: "Unauthorized" }, 401);

	// Look up session token in sessions table
	const session = db
		.select()
		.from(schema.sessions)
		.where(eq(schema.sessions.token, token))
		.get();
	if (!session) return c.json({ error: "Unauthorized" }, 401);

	const dev = db
		.select()
		.from(schema.developers)
		.where(eq(schema.developers.id, session.developerId))
		.get();
	if (!dev) return c.json({ error: "Unauthorized" }, 401);

	c.set("developerId", dev.id);
	c.set("developerUsername", dev.username);
	return next();
}

// ---- Helper: get developer from context ----
function getDeveloperFromContext(c: any) {
	const id = c.get("developerId") as number;
	return db
		.select()
		.from(schema.developers)
		.where(eq(schema.developers.id, id))
		.get();
}

// ---- Auth: Initiate login — instant WhatsApp code ----
developerRoutes.post("/auth/init", async (c) => {
	// Generate a short 6-character registration token
	const token = generateShortToken();
	const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

	// Create the token (not linked to any developer yet)
	db.insert(schema.registrationTokens)
		.values({
			token,
			developerId: null,
			used: false,
			expiresAt,
		})
		.run();

	const waUrl = `https://wa.me/6281234567890?text=.login%20${token}`;
	const phone = "+62 821-2838-3086";

	return c.json({ token, waUrl, phone });
});

/**
 * Generate a short 6-character hex token using Web Crypto API
 */
function generateShortToken(): string {
	const buf = new Uint8Array(3);
	crypto.getRandomValues(buf);
	return Array.from(buf)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/**
 * Generate a session token
 */
function generateSessionToken(): string {
	const uuid = crypto.randomUUID();
	return `sess_${uuid.replace(/-/g, "")}`;
}

// ---- Auth: Poll for login status ----
developerRoutes.get("/auth/status", async (c) => {
	const token = c.req.query("token");
	if (!token) return c.json({ error: "Token required" }, 400);

	const regToken = db
		.select()
		.from(schema.registrationTokens)
		.where(eq(schema.registrationTokens.token, token))
		.get();
	if (!regToken) return c.json({ status: "expired" });

	// Check if token has expired
	if (regToken.expiresAt && new Date(regToken.expiresAt) < new Date()) {
		return c.json({ status: "expired" });
	}

	if (regToken.used && regToken.developerId) {
		const dev = db
			.select()
			.from(schema.developers)
			.where(eq(schema.developers.id, regToken.developerId))
			.get();
		if (!dev) return c.json({ status: "expired" });

		// Developer still has temp username — WhatsApp asked for a real one but hasn't received it yet
		if (dev.username.startsWith("dev_")) {
			return c.json({ status: "awaiting_username" });
		}

		// Developer has a real username — find session and complete login
		const sessions = db
			.select()
			.from(schema.sessions)
			.where(eq(schema.sessions.developerId, dev.id))
			.all();
		const session = sessions[sessions.length - 1];

		return c.json({
			status: "complete",
			sessionToken: session?.token,
			developerId: dev.id,
			username: dev.username,
		});
	}

	return c.json({ status: "pending" });
});

// ---- Legacy login endpoint (deprecated) ----
developerRoutes.post("/login", async (c) => {
	return c.json(
		{
			error:
				"This endpoint has been deprecated. Use POST /developer/auth/init instead.",
		},
		410,
	);
});

// ---- Repository-based command management ----

// 5.1 Register a repository
developerRoutes.post("/repos", bearerAuth, async (c) => {
	const dev = getDeveloperFromContext(c);
	if (!dev) return c.json({ error: "Developer not found" }, 404);

	const { repoUrl, skipValidation } = await c.req.json<{
		repoUrl?: string;
		skipValidation?: boolean;
	}>();

	if (!repoUrl) {
		return c.json({ error: "Missing required field: repoUrl" }, 400);
	}

	try {
		const commands = await commandRegistry.registerRepository(
			dev.id,
			repoUrl.trim(),
			skipValidation,
		);
		return c.json({ success: true, commands }, 201);
	} catch (e: any) {
		return c.json({ error: e.message }, 400);
	}
});

// 5.2 List repositories with their commands
developerRoutes.get("/repos", bearerAuth, (c) => {
	const dev = getDeveloperFromContext(c);
	if (!dev) return c.json({ error: "Developer not found" }, 404);

	const repos = commandRegistry.getRepositories(dev.id);
	return c.json({ repos });
});

// 5.3 Refresh a repository
developerRoutes.post("/repos/:repoUrl/refresh", bearerAuth, async (c) => {
	const dev = getDeveloperFromContext(c);
	if (!dev) return c.json({ error: "Developer not found" }, 404);

	const repoUrl = decodeURIComponent(c.req.param("repoUrl"));
	const { skipValidation } = await c.req.json<{ skipValidation?: boolean }>();

	try {
		const result = await commandRegistry.refreshRepository(
			dev.id,
			repoUrl,
			skipValidation,
		);
		return c.json({ success: true, ...result });
	} catch (e: any) {
		return c.json({ error: e.message }, 400);
	}
});

// 5.4 Delete a repository
developerRoutes.delete("/repos/:repoUrl", bearerAuth, (c) => {
	const dev = getDeveloperFromContext(c);
	if (!dev) return c.json({ error: "Developer not found" }, 404);

	const repoUrl = decodeURIComponent(c.req.param("repoUrl"));
	const count = commandRegistry.deleteRepository(dev.id, repoUrl);
	return c.json({ success: true, deletedCount: count });
});

// ---- Legacy command endpoints (deprecated - return 410) ----

developerRoutes.post("/commands", (c) =>
	c.json(
		{ error: "Endpoint removed. Use POST /developer/repos instead." },
		410,
	),
);
developerRoutes.get("/commands", (c) =>
	c.json({ error: "Endpoint removed. Use GET /developer/repos instead." }, 410),
);
developerRoutes.put("/commands/:id", (c) =>
	c.json(
		{
			error:
				"Endpoint removed. Use POST /developer/repos/:repoUrl/refresh instead.",
		},
		410,
	),
);
developerRoutes.post("/commands/:id/disable", (c) =>
	c.json(
		{
			error: "Endpoint removed. Use DELETE /developer/repos/:repoUrl instead.",
		},
		410,
	),
);
developerRoutes.post("/commands/:id/enable", (c) =>
	c.json(
		{
			error: "Endpoint removed. Use DELETE /developer/repos/:repoUrl instead.",
		},
		410,
	),
);

// ---- 12.6 Command analytics ----
developerRoutes.get("/commands/:id/analytics", bearerAuth, (c) => {
	const id = parseInt(c.req.param("id"));
	const cmd = db
		.select()
		.from(schema.commands)
		.where(eq(schema.commands.id, id))
		.get();
	if (!cmd) return c.json({ error: "Command not found" }, 404);

	const installs = db
		.select()
		.from(schema.installations)
		.where(eq(schema.installations.commandId, id))
		.all();
	const uniqueContacts = new Set(installs.map((i) => i.contactId)).size;

	return c.json({
		installCount: installs.length,
		uniqueContacts,
		usageCount: installs.length,
		errorCount: 0,
	});
});
