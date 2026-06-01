import { Hono } from "hono";
import { db, schema } from "../db";
import { eq } from "drizzle-orm";
import type { WebhookPayload } from "../types";
import { router } from "../router";
import { dedupStore } from "./dedup-store";
import { rateLimitedLog } from "./rate-limited-logger";

export const webhookRouter = new Hono();

/**
 * WAHA Webhook Payload Types
 */
interface WahaWebhookEvent {
  event: string;
  session: string;
  payload: {
    from?: string;
    id?: string;
    body?: string;
    timestamp?: number;
    participant?: string;
    chatId?: string;
    me?: string;
    message?: {
      type?: string;
    };
    [key: string]: unknown;
  };
}

/**
 * Map WAHA session to contact
 */
async function getContactBySession(sessionId: string) {
  return db
    .select()
    .from(schema.contacts)
    .where(eq(schema.contacts.wahaSessionId, sessionId))
    .get();
}

/**
 * Handle incoming webhook event from WAHA
 */
export async function handleWebhookEvent(event: WahaWebhookEvent): Promise<void> {
  const { event: eventType, session: sessionId, payload } = event;

  console.log(event)

  // Only process message events for now
  if (eventType !== "message") {
    return;
  }

  // Skip status messages and other non-user messages
  const messageType = payload.message?.type;
  if (messageType === "status") {
    return;
  }

  const messageId = payload.id || "";
  const body = payload.body || "";
  const timestamp = payload.timestamp || Math.floor(Date.now() / 1000);

  // Detect group messages
  const isGroup = payload.chatId?.includes("@g.us");
  const participantJid = isGroup ? (payload.participant || payload.from) : payload.from;
  const groupJid = isGroup ? payload.chatId : null;

  // Skip empty messages
  if (!participantJid || !messageId) {
    return;
  }

  // Skip outgoing messages (messages sent by the bot itself)
  // WAHA includes 'me' field with the bot's own JID
  const me = (payload as { me?: string }).me;
  if (me && participantJid === me) {
    return;
  }

  // Webhook-level dedup: suppress WAHA replays of the same (sessionId, messageId)
  // before any work happens. The check is synchronous and the mark is applied
  // before fire-and-forget processing.
  if (dedupStore.has(sessionId, messageId)) {
    rateLimitedLog(
      `dedup-hit:${sessionId}`,
     	`[Webhook] dedup-hit suppressed sessionId=${sessionId} messageId=${messageId}`,
    );
    return;
  }
  dedupStore.mark(sessionId, messageId);

  const contact = await getContactBySession(sessionId);
  if (!contact) {
    console.log(`[Webhook] No contact found for session: ${sessionId}`);
    return;
  }

  const webhookPayload: WebhookPayload = {
    sessionId,
    senderJid: participantJid,
    messageId,
    body,
    timestamp,
    isGroupChat: !!isGroup,
    groupJid: groupJid || undefined,
  };

  const logTag = isGroup ? `[Webhook][Group:${groupJid}]` : "[Webhook]";
  console.log(`${logTag} Incoming message from ${participantJid} on session ${sessionId}`);

  // Route to message processor (fire and forget for immediate 200 response)
  router.handleIncomingMessage(webhookPayload, contact.id).catch((error) => {
    console.error("[Webhook] Error handling message:", error);
  });
}

/**
 * POST /webhook - Main webhook endpoint for WAHA
 *
 * Expected Waha webhook format:
 * {
 *   event: "message",
 *   session: "default",
 *   payload: {
 *     from: "123456789@c.us",
 *     id: "message-id",
 *     body: "hello",
 *     timestamp: 1234567890
 *   }
 * }
 *
 * Group message format:
 * {
 *   event: "message",
 *   session: "default",
 *   payload: {
 *     from: "123456789-987654@g.us",
 *     id: "message-id",
 *     body: "hello",
 *     timestamp: 1234567890,
 *     participant: "123456789@c.us",
 *     chatId: "123456789-987654@g.us"
 *   }
 * }
 */
webhookRouter.post("/", async (c) => {
  try {
    const body = await c.req.json<WahaWebhookEvent>();

    // Validate required fields
    if (!body.event || !body.session) {
      console.warn("[Webhook] Invalid webhook payload - missing event or session");
      return c.json({ status: "invalid payload" }, 400);
    }

    // Process webhook asynchronously
    handleWebhookEvent(body).catch((error) => {
      console.error("[Webhook] Async error:", error);
    });

    // Return 200 immediately - don't wait for processing
    return c.json({ status: "ok" });
  } catch (error) {
    console.error("[Webhook] Failed to parse webhook body:", error);
    return c.json({ status: "error parsing body" }, 400);
  }
});

/**
 * GET /webhook - Health check for webhook endpoint
 */
webhookRouter.get("/", (c) => {
  return c.json({ status: "webhook endpoint active" });
});
