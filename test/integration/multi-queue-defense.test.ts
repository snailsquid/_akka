import { describe, it, expect, beforeEach } from "bun:test";
import { clientCache } from "../../src/gateway/client-cache";
import { SessionManager } from "../../src/gateway/session-manager";
import { createTestDb, resetTestDb, closeTestDb } from "../utils/test-db";
import { Database } from "bun:sqlite";
import { WahaClient } from "../../src/gateway/waha-client";

/**
 * Regression: concurrent getClientForContact calls for the same sessionId
 * must return the same WahaClient instance, so the 500ms serial send queue
 * is per-session, not per-call.
 *
 * We verify the invariant at the cache level: regardless of how many parallel
 * lookups happen, the cache holds exactly one entry per sessionId.
 */
describe("multi-queue defense (one WahaClient per sessionId)", () => {
  let sqlite: Database;

  beforeEach(() => {
    const testDb = createTestDb();
    sqlite = testDb.sqlite;
    clientCache.clear();
  });

  it("concurrent getClient returns the same instance", () => {
    const sessionId = "shared-session";
    const a = new WahaClient("http://test", sessionId);
    clientCache.setClient(sessionId, a);

    // Simulate N parallel lookups
    const results = Array.from({ length: 100 }, () =>
      clientCache.getClient(sessionId),
    );

    for (const r of results) {
      expect(r).toBe(a);
    }
    expect(clientCache.size()).toBe(1);
  });

  it("SessionManager.addSession populates the cache once", () => {
    const sessionId = "added-session";
    const sm = new SessionManager("http://test");
    sm.addSession(99, sessionId);

    expect(clientCache.getClient(sessionId)).toBeDefined();
    expect(clientCache.size()).toBe(1);

    // Adding the same session twice is a no-op
    sm.addSession(99, sessionId);
    expect(clientCache.size()).toBe(1);
  });

  it("SessionManager.removeSession evicts the cache entry", () => {
    const sm = new SessionManager("http://test");
    sm.addSession(1, "s-1");
    sm.addSession(2, "s-2");
    expect(clientCache.size()).toBe(2);

    sm.removeSession("s-1");
    expect(clientCache.getClient("s-1")).toBeUndefined();
    expect(clientCache.getClient("s-2")).toBeDefined();
  });

  it("SessionManager.initialize populates the cache from contacts", async () => {
    const sessionId = "default";
    sqlite.exec(
      "INSERT INTO contacts (id, name, phone_number, waha_session_id) VALUES (1, 'Default', '+1234567890', 'default')",
    );
    // Stub the global fetch so checkHealth (called from initialize's initial
    // health check) doesn't try to hit a real WAHA instance.
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ status: "WORKING" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })) as unknown as typeof fetch;
    try {
      const sm = new SessionManager("http://test", 60000);
      await sm.initialize();
      expect(clientCache.getClient(sessionId)).toBeDefined();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
