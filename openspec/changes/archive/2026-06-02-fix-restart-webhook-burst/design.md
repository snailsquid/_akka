## Context

The bot is a multi-session WhatsApp gateway built on WAHA (WhatsApp HTTP API). Outbound messages go through `WahaClient.sendMessage`, which serializes sends via a 500ms-promise-chain queue to avoid tripping anti-spam thresholds. Incoming webhooks from WAHA are processed fire-and-forget at `src/gateway/webhook.ts`.

A user-reported bug: after server restart, a burst of messages is sent in rapid succession. The diagnosis identified two compounding causes:

1. **Multi-queue throttle bypass.** `Router.getClientForContact` (`src/router/index.ts:46-67`) falls back to `new WahaClient(...)` when the session is not in the `SessionManager`'s in-memory map. Each new client has its own `sendQueue = Promise.resolve()`, so the 500ms gap is silently defeated for that call. The throttle is currently per-instance, not per-session.
2. **No `messageId` idempotency.** `webhook.ts:60` captures `messageId` but never compares against a seen-set. WAHA can replay buffered webhooks on session reconnect; each replay produces a fresh reply.

There is no shared singleton or registry for `WahaClient` instances today — they are constructed ad hoc by `SessionManager.initialize()` (eager) and by the router fallback (lazy, broken). The dedup store does not exist.

## Goals / Non-Goals

**Goals:**

- One `WahaClient` instance per `sessionId` for the lifetime of the process.
- Duplicate webhook events (same `messageId`) are suppressed at the boundary and never produce outbound messages.
- The fix is observable: diagnostic logs make the two invariants verifiable from production logs alone.
- Minimal blast radius: no schema migration, no new external dependency, no behavioral change to the existing 500ms send interval or the webhook signature.

**Non-Goals:**

- Persisting dedup state across restarts. In-memory is sufficient because replays typically happen within minutes of the original delivery.
- Per-recipient rate floors, jitter, or volume caps. These are rate-limit hardening concerns handled in a separate change.
- Wiring the `Scheduler` at startup. That is a separate latent-burst risk.
- Replacing the 500ms interval with an adaptive or load-based throttle.
- Changing the WAHA webhook contract or adding signature verification.

## Decisions

### 1. Shared `client-cache` module instead of moving cache into `SessionManager`

`SessionManager` already has an in-memory map of session info, but the router cannot import it transitively without creating a layer inversion (router depends on session manager today, and a tighter coupling would force a circular import once dedup needs router metadata). A standalone `src/gateway/client-cache.ts` module owns the `Map<sessionId, WahaClient>` and is imported by both `SessionManager` (to populate/evict) and `Router` (to read). The module exposes `getClient(sessionId)`, `setClient(sessionId, client)`, and `clear()`. Construction goes through `setClient` so the cache is the only source of truth.

**Alternative considered:** Add a `getClient(sessionId)` method to `SessionManager` and remove the router's map. Rejected because the router fallback path lives in router code, and moving the lookup to `SessionManager` would create a circular import once `SessionManager` later needs to call into router-level helpers (e.g., for warm-up hooks). Standalone module avoids this.

### 2. Cache is populated by `SessionManager.initialize()`, awaited at startup

`src/index.ts` currently fires `sessionManager.initialize()` without awaiting. The new behavior awaits `initialize()` before `app.fetch` is bound to the port. If `initialize()` fails, the process exits with a clear error rather than serving webhooks in a half-initialized state. This eliminates the startup race where webhooks arrive before the cache is populated — the original trigger for the multi-queue bug.

**Alternative considered:** Have the webhook handler return 503 with `Retry-After` until init completes. Rejected because it adds a third state (initializing) for the webhook endpoint to handle, and most production deployments run behind a process manager that restarts on failure anyway. Awaiting `initialize()` is simpler and stricter.

### 3. Dedup store is in-memory with TTL, not SQLite-backed

A `Map<messageId, expiresAt>` with lazy eviction on read and a periodic full sweep. Default TTL is 10 minutes, configurable via env. WAHA's documented retry behavior is to retry unacked webhooks a few times within minutes, never hours, so a 10-minute window covers all realistic replays. Memory is bounded by `(inbound webhooks per 10 min)` × `(messageId string size)`, which for this platform is negligible.

**Alternative considered:** Persist to SQLite. Rejected because (a) it requires a schema change, (b) the dedup window does not need to survive restarts (replays happen within minutes of the original), and (c) persistence adds read/write overhead on the hot path. A follow-up change can move to SQLite if data shows replays spanning restarts.

### 4. Dedup key is `(sessionId, messageId)`, not just `messageId`

WhatsApp messageIds are globally unique, so using `messageId` alone is sufficient for correctness. But scoping by `sessionId` makes the dedup store easier to invalidate when a session is removed (e.g., admin disconnects a session) — you drop the entire session's seen-set rather than scanning. It also makes the diagnostic log more informative. No correctness cost.

**Alternative considered:** Global `messageId` key. Functionally equivalent for correctness; the per-session scoping is purely an operational convenience. If profiling later shows the per-session eviction is hot, this can be revisited.

### 5. Diagnostic logging is structured and bounded

A single log line per process at startup summarizing the loaded session count and the dedup TTL. One log line per duplicate webhook suppression (rate-limited to one per 10 seconds per session to avoid log floods during a WAHA replay storm). One log line on each `WahaClient` cache miss that previously would have created a new client — but in the new design, the cache should never miss for a known session, so the absence of these logs is itself the signal that the fix is working.

**Alternative considered:** Metrics export to Prometheus. Out of scope for this change; logs are sufficient to confirm the fix in the field.

### 6. Webhook handler does the dedup check synchronously before fire-and-forget processing

The dedup check happens at the top of `handleWebhookEvent`, before the `router.handleIncomingMessage(...).catch(...)` call. A duplicate returns immediately, no work is done, no logs beyond the suppressed-event line. This keeps the cost of a duplicate near zero.

**Alternative considered:** Dedup inside the router. Rejected because the router is downstream of the webhook signature; duplicates should be rejected as early as possible, and the router may have legitimate reasons to be called with the same `messageId` from a non-webhook code path in the future.

## Risks / Trade-offs

- **In-memory dedup loses state on restart.** A WAHA replay that occurs across a restart will be re-processed. → Mitigation: keep TTL short (10 min), and accept that the worst case is one extra reply per user per restart. For replies-only, this is below the rate-limit risk threshold. If this proves wrong in production, the follow-up change moves dedup to SQLite.

- **Awaiting `SessionManager.initialize()` blocks server boot.** A slow WAHA instance (e.g., the 30s timeout × N sessions) delays readiness. → Mitigation: surface a clear `console.log` while init is in progress so the deployment is observable. The pre-change behavior was to start serving traffic in an undefined state, which is strictly worse.

- **Cache is process-local.** A multi-instance deployment would have one cache per process, and a dedup store per process. This is the same as the current architecture for the queue, so no regression. → Mitigation: document that the fix is per-process; a multi-instance rate-limiter is a future concern.

- **Removing the router's `new WahaClient` fallback may break a code path we did not anticipate.** The fallback is a safety valve for "session not in map" — if there is a contact whose `wahaSessionId` is not yet registered with `SessionManager`, the router will now throw rather than recover. → Mitigation: the only way a contact's session is missing is if the contact was added directly to the DB without going through the contact-creation flow. Audit the contact-creation paths in the admin/developer UIs to confirm they all call `addSession`. Add an integration test that creates a contact and verifies a webhook for that contact hits the cache.

- **Dedup TTL is a guess.** 10 minutes is the recommended WAHA retry window, but WAHA's behavior is not formally documented. → Mitigation: make the TTL configurable via env (`DEDUP_TTL_MS`). Default is 10 minutes.

## Migration Plan

1. Land the change behind the existing build; no feature flag needed (the fix is strictly safer than the current behavior).
2. Deploy with `DEDUP_TTL_MS` left at the default. Monitor logs for:
   - "dedup hit" lines (should be > 0 only when WAHA is replaying)
   - "client cache miss" lines (should be 0 in normal operation; non-zero indicates a contact was added without `addSession` being called)
3. Rollback is a single revert. Both the cache and the dedup store are additive: removing them reverts to the previous broken behavior, no data corruption risk.

## Open Questions

- Should the dedup TTL be persisted across restarts in a follow-up, or is the 10-minute window sufficient for this platform's WAHA configuration? Decision deferred until production data is available.
- The contact-creation paths in admin/developer UIs need an audit to confirm all of them call `SessionManager.addSession`. Deferred to the integration test in the tasks list.
- Should the `Router` no longer hold a reference to the `WahaClient` at all, or keep a per-request lookup? Per-request is fine for the cache hit case (O(1) map lookup) and removes the staleness risk of holding long-lived references.
