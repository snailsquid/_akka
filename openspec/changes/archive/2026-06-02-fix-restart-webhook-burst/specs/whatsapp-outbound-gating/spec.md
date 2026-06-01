## ADDED Requirements

### Requirement: Per-session send queue

The system MUST maintain exactly one `WahaClient` instance per `sessionId` for the lifetime of a process, so that the existing 500ms serial send interval cannot be bypassed by multiple clients racing for the same WAHA session.

#### Scenario: Concurrent lookups return the same client

- **WHEN** two webhook handlers concurrently call `getClientForContact` for the same `sessionId`
- **THEN** they receive the same `WahaClient` instance and the same `sendQueue` reference

#### Scenario: Cache miss is impossible for a known session

- **WHEN** `SessionManager` has finished `initialize()` and the contact's `wahaSessionId` is registered
- **THEN** `Router.getClientForContact` returns the cached client without constructing a new `WahaClient`

#### Scenario: Runtime session addition updates the cache

- **WHEN** `SessionManager.addSession(sessionId, client)` is called at runtime
- **THEN** subsequent calls to `Router.getClientForContact` for the contact owning that `sessionId` return the added client

#### Scenario: Session removal evicts the cache entry

- **WHEN** `SessionManager.removeSession(sessionId)` is called
- **THEN** the cache no longer holds an entry for that `sessionId`

### Requirement: Webhook message deduplication

The system MUST suppress duplicate webhook events identified by `(sessionId, messageId)` within a configurable TTL window, so that a WAHA replay storm does not produce duplicate outbound replies.

#### Scenario: Duplicate delivery produces no outbound message

- **WHEN** WAHA delivers two webhook events for the same `(sessionId, messageId)` within the TTL window
- **THEN** the first delivery is processed normally and the second delivery produces zero outbound messages

#### Scenario: Duplicate detection emits a structured log

- **WHEN** a duplicate `(sessionId, messageId)` is suppressed
- **THEN** the system emits a structured log line containing the `sessionId`, `messageId`, and a marker indicating suppression

#### Scenario: TTL expiry allows re-delivery

- **WHEN** the TTL window for a `(sessionId, messageId)` has elapsed
- **THEN** a subsequent delivery of that same `(sessionId, messageId)` is processed as a new event, not as a duplicate

#### Scenario: TTL is configurable

- **WHEN** the operator sets the `DEDUP_TTL_MS` environment variable
- **THEN** the dedup window equals that value in milliseconds; the default is 10 minutes

### Requirement: Startup readiness gate

The system MUST complete `SessionManager.initialize()` before the HTTP server begins accepting webhook traffic, so that the client cache is fully populated when the first webhook arrives.

#### Scenario: Init runs before listen

- **WHEN** the process boots
- **THEN** the HTTP server does not bind its port until `SessionManager.initialize()` resolves

#### Scenario: Init failure aborts startup

- **WHEN** `SessionManager.initialize()` rejects
- **THEN** the process exits with a non-zero status and a logged error, and the HTTP server is never bound

#### Scenario: Successful init logs readiness

- **WHEN** `SessionManager.initialize()` resolves
- **THEN** a single structured log line reports the loaded session count before webhook traffic is accepted

### Requirement: Diagnostic observability

The system MUST emit structured log signals that allow operators to verify the gating invariants from production logs alone, without requiring metrics infrastructure.

#### Scenario: Startup summary

- **WHEN** `SessionManager.initialize()` completes
- **THEN** a single log line reports the number of sessions loaded and the dedup TTL in effect

#### Scenario: Dedup-hit log

- **WHEN** a duplicate webhook is suppressed
- **THEN** a log line identifies the `sessionId`, `messageId`, and a suppression marker; the line is rate-limited to one emission per 10 seconds per `sessionId` to prevent log floods during a replay storm

#### Scenario: Cache-miss visibility

- **WHEN** `Router.getClientForContact` cannot find a `sessionId` in the cache
- **THEN** a log line identifies the missing `sessionId` and the originating contact, so a contact-creation path that bypasses `SessionManager.addSession` is detectable in production
