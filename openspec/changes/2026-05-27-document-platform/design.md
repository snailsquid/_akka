## Context

Akka is a greenfield WhatsApp-native command platform. Users interact entirely via WhatsApp — no web UI, no app, no login. Developers build commands with an SDK and register via a token-based flow. The platform runs on Bun with Waha for WhatsApp integration. Commands are fetched from GitHub repos, sandboxed via `vm2`, and executed. A SQLite-backed scheduler handles delayed tasks.

The codebase is fully implemented with all 15 SDD phases completed. This design captures the architectural decisions that produced the final codebase.

## Architecture

### Entry Point

`src/index.ts` re-exports `src/server.ts`, which is the Hono application root:

```typescript
// src/server.ts
const app = new Hono();
app.use("*", cors());
app.use("*", logger());
app.get("/", healthCheck);
app.route("/webhook", webhookRouter);
app.route("/api", commandRoutes);
app.route("/admin", adminRoutes);
app.route("/developer", developerRoutes);
app.use("/admin/*", serveFrontend(...));
app.use("/developer/*", serveFrontend(...));
```

### Webhook Pipeline

```
WAHA POST /webhook → handleWebhookEvent() → router.handleIncomingMessage()
```

The webhook handler in `src/gateway/webhook.ts` extracts sender JID, contact JID, message body, and message ID from the WAHA payload. It maps the WAHA session to a contact via `contacts.waha_session_id`, then delegates to the router.

### Message Router

The router (`src/router/index.ts`) is the central dispatch engine:

1. **Flow check** — If the user has an active conversation flow (e.g., marketplace browsing), route the message as a flow response
2. **Command parsing** — Strip `.`, match against user slugs (installed commands) and system commands
3. **Reaction management** — Send ⏳ on receipt, replace with ✅ on success or ❌ on error
4. **Handler dispatch** — System commands → `handleSystemCommand()`, installed commands → `executeCommandCmd()`, unknown → error message

### Command Execution Flow

```
User sends ".weather Tokyo"
  → Router parses slug="weather", args=["Tokyo"]
  → Checks installation → found
  → Fetches cached source from registry
  → Creates CommandContext (send, react, schedule, fetch, userId, args, message, contactId)
  → Runs via vm2 sandbox (5s timeout)
  → Command calls ctx.send() → WAHA sends to WhatsApp
```

### Database Schema (9 tables)

| Table | Purpose |
|-------|---------|
| `contacts` | WhatsApp numbers and WAHA session mapping |
| `users` | User identification by phone JID, anonymized IDs |
| `developers` | Developer accounts with username and linked WhatsApp JID |
| `developer_groups` / `developer_group_members` | Developer collaboration groups |
| `commands` | Command metadata (slug, name, description, usage, repo_url, entry_point, status) |
| `installations` | User-command associations with user-defined slugs |
| `scheduled_tasks` | Delayed execution tasks (reminders, timers) |
| `registration_tokens` | Token-based developer registration |
| `conversation_flows` | Multi-turn conversation state (marketplace flow) |
| `sessions` | Developer session tokens for web portal auth |

### Frontend Architecture

Two separate Vite/React applications:
- `admin-ui/` — Admin dashboard for managing WhatsApp contacts and sessions
- `developer-ui/` — Developer dashboard for managing commands and repositories

Both are built and served as static files from the Bun server under `/admin/` and `/developer/`.

## Goals / Non-Goals

**Goals:**
- WhatsApp-native user experience with text-based interactions
- Developer-friendly SDK with minimal boilerplate
- Per-contact command isolation
- Sandboxed execution of community commands
- Extensible architecture for adding more contacts

**Non-Goals (v1):**
- Command approval/review process
- Revenue model or billing
- User authentication (users identified by WhatsApp JID)
- Media-heavy commands (text-focused)
- Multi-language support

## Decisions

### 1. Waha over WhatsApp Business API

**Decision**: Use Waha (unofficial WhatsApp web multi-device gateway) instead of Meta's official Cloud API.

**Why**: No Meta approval process, free, supports all message types including reactions, can operate immediately with a personal WhatsApp number.

**Risk**: Unofficial API can break. **Mitigation**: Waha has an active community; can migrate to Cloud API later.

### 2. SQLite over Postgres/Redis

**Decision**: Use SQLite (via Bun's built-in driver) for all storage including scheduled tasks.

**Why**: Zero infrastructure setup, Bun has native SQLite support, sufficient for v1 scale, single file backup.

**Trade-off**: Won't handle high concurrency well. Acceptable for v1 demo scale.

### 3. vm2 for Sandbox

**Decision**: Use `vm2` for sandboxed command execution.

**Why**: True V8 isolate separation, no filesystem access by default, network access allowed via `ctx.fetch` only.

**Risk**: `vm2` has had security vulnerabilities. **Mitigation**: Timeout protection (5s), sandbox isolation testing, no filesystem access.

### 4. GitHub as Command Source

**Decision**: Commands are stored in GitHub repos; platform fetches and caches them.

**Why**: Developers already use GitHub, version control built-in, easy for platform to poll for updates.

**Flow**: Developer registers → verifies on web portal → submits GitHub repo URL → Platform fetches → Validates export structure → Caches locally → Periodic refresh.

### 5. Text-Based Marketplace UX

**Decision**: Use text responses for marketplace interaction instead of reactions.

**Why**: WhatsApp only shows recent emojis — number reactions clutter the reaction picker. Text responses ("1", "2", "n", "p") are more reliable and accessible.

### 6. Command ID: Developer/Slug (GitHub Model)

**Decision**: Command IDs are prefixed by developer username, like GitHub repos (e.g., `alice/remind-me`).

**Why**: Slugs are freeform and NOT globally unique — multiple developers can have a command called "remind me". The developer prefix makes commands globally unique.

**Slug collision on install**: When a user installs a command whose slug matches an existing installation:
- System asks: "You already have `.say` installed. Replace with `alice/say`, or install as `.say1`?"
- Replace: overwrites the existing installation
- Create new: adds postfix (`.say` → `.say1`)

### 7. Single SDK Context Object

**Decision**: Developers receive a single `ctx` object with all platform APIs.

**API surface**:
```typescript
ctx.send(text)        // send message to user
ctx.react(emoji)      // react to user's message
ctx.schedule(dur, fn) // delayed execution
ctx.fetch(url, opts)  // call external servers (full network access)
ctx.userId            // anonymized user ID
ctx.args              // parsed arguments
ctx.message           // full message text
ctx.contactId         // which contact
```

### 8. Three Roles

| Role | Access | Registration |
|------|--------|--------------|
| _akka Admin | Web portal (admin dashboard). Manages contacts, sessions. | Manual (platform owner) |
| Developer | Web portal (dev dashboard) + WhatsApp (.register). Manages commands. | Via WhatsApp + web portal |
| User | WhatsApp only. Installs/uses commands. | Auto (first message) |

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Waha protocol break | Commands stop working | Active community; can migrate to Cloud API |
| SQLite concurrency | Slow under high load | Acceptable for demo; migrate to Postgres later |
| Malicious commands | Security breach | Sandbox isolation; no filesystem; network via ctx.fetch only |
| Server restart loses in-flight commands | User experience gap | SQLite scheduler persists; restart recovery |
| WhatsApp account ban | Service outage | Use secondary number; have backup numbers ready |
| Command execution timeout | Hung commands | 5s hard timeout in sandbox; kill and report error |
