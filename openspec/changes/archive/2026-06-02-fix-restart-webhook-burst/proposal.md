## Why

When the server restarts, the bot sometimes sends a burst of messages to users in rapid succession. This is the highest-risk behavior for triggering WhatsApp's anti-spam heuristics on ordinary (non-Business-API) accounts, and it is a concrete user-reported bug. The burst has two compounding causes that the diagnosis identified:

1. **Multi-queue throttle bug.** `Router.getClientForContact` falls back to creating a new `WahaClient` per call whenever the session is missing from the in-memory map. Each new client has its own fresh `sendQueue = Promise.resolve()`, so the 500ms serial throttle is silently bypassed for that call. The 500ms queue is currently per-instance instead of per-session.
2. **No webhook idempotency.** `webhook.ts` captures `messageId` but never checks it against a seen-set. If WAHA replays buffered events on reconnect, each replay produces a fresh reply, doubling outbound traffic on top of any existing burst.

## What Changes

- **Cache `WahaClient` instances by `sessionId`.** Add a module-level `Map<sessionId, WahaClient>` consulted by `Router.getClientForContact`. The cache is populated by `SessionManager.initialize()` and updated by `addSession` / `removeSession`. The fallback path that constructs a new client is removed in favor of cache-or-fail.
- **Add `messageId` deduplication at the webhook boundary.** Persist a TTL-bounded set of seen messageIds (in-memory LRU with SQLite-backed overflow is acceptable; in-memory is the minimum). The webhook handler returns early on a duplicate. The dedup window must be longer than the longest plausible WAHA replay window (suggested: 10 minutes, configurable).
- **Add startup diagnostics.** Log, once per process, the `WahaClient` instantiation count per `sessionId` and the count of duplicate messageIds seen. These are the two signals that would have made this bug diagnosable in production logs; ship them so the next regression is visible.
- **No change to the 500ms per-send gap.** Existing throttle interval is preserved.

Out of scope for this change (tracked separately):

- Per-recipient floor (minimum gap between consecutive replies to the same JID).
- Jitter on the send interval.
- Wiring the `Scheduler` at startup (which would create a new class of past-due burst on restart).
- Volume caps (daily/hourly per session).

## Capabilities

### New Capabilities

- `whatsapp-outbound-gating`: Outbound WhatsApp messages are gated so that the throttle and idempotency invariants hold even across restarts and WAHA replays. The capability covers (a) one send queue per WAHA session, (b) duplicate-message suppression at the webhook boundary, and (c) the diagnostic signals that prove the invariants are holding.

### Modified Capabilities

None. This change does not alter any existing requirement-level behavior; it adds a new capability for an infrastructure concern.

## Impact

Affected code:

- `src/gateway/waha-client.ts` — no functional change to the queue; constructor becomes idempotent-safe (calling `new WahaClient(...)` while a cached instance exists for the same `sessionId` is a no-op or returns the cached one).
- `src/gateway/session-manager.ts` — `initialize()`, `addSession()`, `removeSession()` update the shared cache; `initialize()` awaits completion before the server starts accepting webhook traffic (or the server returns 503 until init completes — design decision deferred to design phase).
- `src/gateway/webhook.ts` — checks `messageId` against the dedup store before processing; logs duplicate events.
- `src/router/index.ts` — `getClientForContact` becomes cache-only; the "create new client on miss" fallback is removed.
- New module: `src/gateway/dedup-store.ts` — TTL-bounded seen-set abstraction.
- New module: `src/gateway/client-cache.ts` — sessionId → `WahaClient` map shared between `SessionManager` and `Router`.

Affected tests:

- `test/gateway/waha-client.test.ts` — extend to cover dedup behavior.
- New: `test/gateway/dedup-store.test.ts`.
- New: `test/gateway/client-cache.test.ts`.

No external API or contract changes. No database schema changes (dedup store is in-memory; can be moved to SQLite in a follow-up if restart-survival is needed).

No breaking changes.
