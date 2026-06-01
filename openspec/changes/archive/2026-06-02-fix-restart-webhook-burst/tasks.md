## 1. New modules

- [x] 1.1 Create `src/gateway/client-cache.ts` exporting a singleton `clientCache` with `getClient(sessionId)`, `setClient(sessionId, client)`, `removeClient(sessionId)`, and `clear()`, backed by a `Map<string, WahaClient>`
- [x] 1.2 Create `src/gateway/dedup-store.ts` exporting a singleton `dedupStore` with `has(sessionId, messageId)`, `mark(sessionId, messageId)`, and `startSweep()`; TTL configurable via `DEDUP_TTL_MS` env (default 600000 ms = 10 min); lazy eviction on read plus a periodic full sweep
- [x] 1.3 Add a rate-limited logger helper (or inline it) that emits a given structured log line at most once per 10 seconds per key, for use in dedup-hit and cache-miss logs

## 2. Wire `SessionManager` to the client cache

- [x] 2.1 In `SessionManager.initialize()`, call `clientCache.setClient(sessionId, client)` for every loaded contact after the `WahaClient` is constructed
- [x] 2.2 In `SessionManager.addSession()`, call `clientCache.setClient(sessionId, client)` after the new `WahaClient` is constructed
- [x] 2.3 In `SessionManager.removeSession()`, call `clientCache.removeClient(sessionId)` before deleting the in-memory entry
- [x] 2.4 Add a startup-summary log line at the end of `initialize()` reporting the loaded session count and the dedup TTL in effect

## 3. Wire `Router` to the client cache

- [x] 3.1 In `Router.getClientForContact`, replace the `getAllSessions().find(...)` lookup with `clientCache.getClient(sessionId)`; if a contact's `wahaSessionId` is not in the cache, look up the `sessionId` from the contact record in the DB and read from the cache again
- [x] 3.2 Remove the `new WahaClient(this.wahaBaseUrl, contact.wahaSessionId)` fallback path; if the cache misses for a known contact, return `null` and emit a structured "cache-miss" log line that identifies the `sessionId` and contact
- [x] 3.3 Verify there is no other code path in `src/router/` or `src/commands/` that constructs a `WahaClient` directly via `new`; replace any with `clientCache.getClient` or `SessionManager.addSession`

## 4. Wire webhook handler to the dedup store

- [x] 4.1 In `webhook.handleWebhookEvent`, after parsing `sessionId` and `messageId`, call `dedupStore.has(sessionId, messageId)`; if true, emit a rate-limited "dedup-hit" log line and return immediately
- [x] 4.2 If the messageId is fresh, call `dedupStore.mark(sessionId, messageId)` before the fire-and-forget processing begins
- [x] 4.3 Ensure the dedup check happens synchronously at the top of the handler, before the `router.handleIncomingMessage(...).catch(...)` call

## 5. Startup readiness gate

- [x] 5.1 In `src/index.ts`, `await` `sessionManager.initialize()` before the default export that binds `app.fetch` to the port
- [x] 5.2 Add an init-failure exit path: on rejection, log a clear error and `process.exit(1)` so the process manager can restart cleanly
- [x] 5.3 Confirm `sessionManager.start()` is called only after the awaited init resolves

## 6. Tests

- [x] 6.1 Unit: `client-cache` — `setClient`/`getClient` round-trip; `removeClient` evicts; `clear` empties; concurrent `getClient` for the same key returns the same instance
- [x] 6.2 Unit: `dedup-store` — `has`/`mark` round-trip; entry expires after TTL; sweep removes expired entries; mark of a non-expired entry extends nothing (re-marks with fresh TTL is acceptable)
- [x] 6.3 Unit: rate-limited logger — emits once per 10s per key; emits again after the window elapses
- [x] 6.4 Integration: contact-creation path audit — every code path that inserts a row into the `contacts` table also calls `SessionManager.addSession`; assert by listing call sites in `src/admin/routes.ts`, `src/developer/routes.ts`, and any seed scripts
- [x] 6.5 Regression: WAHA replay — simulate two webhooks with the same `(sessionId, messageId)` arriving within 1s; assert exactly one outbound `sendText` request is issued
- [x] 6.6 Regression: multi-queue defense — simulate `Router.getClientForContact` being called concurrently for the same `sessionId` from N parallel handlers; assert exactly one `WahaClient` instance is constructed
- [x] 6.7 Run `bun run test` and confirm all suites pass

## 7. Configuration and verification

- [x] 7.1 Add `DEDUP_TTL_MS=600000` to `.env.example` with a one-line comment explaining the default and the override behavior
- [x] 7.2 Run `openspec validate fix-restart-webhook-burst` and confirm no validation errors
- [x] 7.3 Run the project's lsp/typecheck command on the changed files and confirm no new errors
