import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { dedupStore } from "../../src/gateway/dedup-store";
import { createTestDb, resetTestDb, closeTestDb } from "../utils/test-db";
import { Database } from "bun:sqlite";
import { clientCache } from "../../src/gateway/client-cache";

/**
 * Regression: a WAHA replay of the same (sessionId, messageId) within 1s must
 * be suppressed at the dedup-store boundary so the router never sees it twice.
 *
 * This test exercises the dedup-store directly, which is the only path the
 * webhook handler consults. If the store is correctly populated and queried,
 * the handler will short-circuit on the second call.
 */
describe("WAHA replay regression (dedup boundary)", () => {
  let sqlite: Database;

  beforeEach(() => {
    const testDb = createTestDb();
    sqlite = testDb.sqlite;
    dedupStore.clear();
    clientCache.clear();
  });

  afterEach(() => {
    closeTestDb(sqlite);
    dedupStore.clear();
    clientCache.clear();
  });

  it("first delivery marks, second delivery is suppressed", () => {
    const sessionId = "replay-session";
    const messageId = "msg-replay-1";

    // Pre-condition: not seen yet
    expect(dedupStore.has(sessionId, messageId)).toBe(false);

    // First delivery: handler would call mark()
    dedupStore.mark(sessionId, messageId);
    expect(dedupStore.has(sessionId, messageId)).toBe(true);

    // Second delivery (WAHA replay): handler's dedup check returns true and
    // it returns immediately. mark() is not called again with a fresh TTL,
    // but the entry is still present so the check stays true.
    expect(dedupStore.has(sessionId, messageId)).toBe(true);
  });

  it("suppression holds across many replays", () => {
    const sessionId = "storm-session";
    const messageId = "msg-storm-1";
    dedupStore.mark(sessionId, messageId);

    for (let i = 0; i < 100; i++) {
      expect(dedupStore.has(sessionId, messageId)).toBe(true);
    }
  });

  it("different messageIds are not deduped against each other", () => {
    const sessionId = "replay-session";
    dedupStore.mark(sessionId, "msg-A");
    dedupStore.mark(sessionId, "msg-B");

    expect(dedupStore.has(sessionId, "msg-A")).toBe(true);
    expect(dedupStore.has(sessionId, "msg-B")).toBe(true);
    expect(dedupStore.has(sessionId, "msg-C")).toBe(false);
  });

  it("dedup key is scoped per session", () => {
    dedupStore.mark("session-1", "msg-1");
    expect(dedupStore.has("session-1", "msg-1")).toBe(true);
    expect(dedupStore.has("session-2", "msg-1")).toBe(false);
  });
});
