import app from "./server";
import { initSessionManager } from "./gateway/session-manager";
import { Scheduler } from "./scheduler";

const port = Number(process.env.PORT) || 3000;
const wahaBaseUrl = process.env.WAHA_BASE_URL || "http://localhost:3001";

async function main() {
  console.log(`🚀 Akka WhatsApp Platform starting on port ${port}`);

  const sessionManager = initSessionManager(wahaBaseUrl);
  await sessionManager.initialize();
  sessionManager.start();
  console.log(`[SessionManager] Started monitoring WAHA sessions`);

  const scheduler = new Scheduler(async () => {}, 30000);
  scheduler.startCleanup();
  console.log(`[Scheduler] Started cleanup job`);

  const shutdown = (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down...`);
    sessionManager.stop();
    process.exit(0);
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

process.on("unhandledRejection", (reason, promise) => {
  console.error("[Unhandled Rejection] Reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[Uncaught Exception] Error:", error);
});

main().catch((err) => {
  console.error("[Startup] Initialization failed:", err);
  // Exit non-zero so the process manager restarts cleanly. The server is
  // never bound when init fails, so there is no half-initialized state to
  // recover from.
  process.exit(1);
});

export default {
  port,
  fetch: app.fetch,
};
