# Context Handoff — Akka WhatsApp Bot Platform

## Project Overview
- **Akka**: WhatsApp bot platform built with Bun, Hono, Drizzle ORM, and WAHA
- Entry: `index.ts` → `src/server.ts` → Hono app with `/webhook` endpoint
- Database: SQLite via Drizzle ORM (`src/db/schema.ts`)
- Command execution: Sandboxed via `vm2` (`src/commands/executor.ts`)

---

## Issue 1: `TypeError: Attempted to assign to readonly property`

### Root Cause
**File**: `src/commands/executor.ts`, line 37

```typescript
return Object.freeze(ctx);
```

`Object.freeze(ctx)` freezes the context object at runtime. Any command that attempts to write to any property on `ctx` (e.g., `ctx.userId = "new"`, `ctx.args.push("x")`, `ctx.message = "..."`) will throw `TypeError: Attempted to assign to readonly property`.

The `CommandContext` interface (`src/types.ts`, lines 104-113) declares `readonly` on `userId`, `args`, `message`, `contactId` — this is compile-time only. The actual runtime freeze is from `Object.freeze()`.

### Where it manifests
- External commands fetched from GitHub repos (via `commandRegistry.fetchCommandRepo`) are executed via `vm2` with the frozen ctx injected as `ctx` in the sandbox
- Demo commands (`src/commands/demo.ts`) don't modify ctx, so they pass tests
- Real commands from repos may try to modify ctx properties, causing the error
- The error bubbles up through `handleIncomingMessage` in `src/router/index.ts`, triggering the error path at lines 332-336

### Key code path
```
router.handleIncomingMessage() [line 261]
  → router.executeCommandCmd() [line 310]
    → commandExecutor.createExecutionContext() [line 336]
      → Object.freeze(ctx) [line 37 of executor.ts]
    → commandExecutor.executeCommand(source, ctx) [line 366]
      → vm.run() with frozen ctx [line 379]
      → handler(ctx) — if ctx is mutated, TypeError thrown
```

### Risk
- `Object.freeze()` is shallow — nested objects inside ctx properties are still mutable
- The `send`, `react`, `schedule`, `fetch` functions are async and not frozen individually
- Commands might try to extend ctx (e.g., `ctx.customData = {}`) — also blocked by freeze

---

## Issue 2: Test commands without a repo

### Context
Demo commands are defined in `src/commands/demo.ts` as `CommandDefinition` objects:
- `echoCommand` — `.echo [text]`
- `remindCommand` — `.remind me [duration] [message]`
- `translateCommand` — `.translate [text] [language]`

These are standalone `CommandDefinition` objects that do NOT have a `repoUrl` field. They are **not** stored in the database and are **not** imported into the production routing flow (`src/router/index.ts`).

### Where they live
- **Definition**: `src/commands/demo.ts` (lines 1-63)
- **Tests**: `test/commands/demo.test.ts` (lines 1-128)
- **Not imported anywhere in production code** — they exist only as test fixtures and unit test targets

### What "without a repo" means
The `CommandRecord` type in `src/types.ts` (line 71) has a `repoUrl: string` field that is required. The demo commands don't have repo URLs because they're not backed by GitHub repositories — they're built-in. The registry only deals with commands fetched from GitHub repos.

### Data flow
Commands in the system come from:
1. **GitHub repos** → `registerRepository()` / `registerCommand()` → stored in `commands` table with `repoUrl`
2. **Demo commands** → standalone `CommandDefinition` objects, never registered, never in DB

The question "remove test commands that don't have a repo" likely refers to cleaning up demo commands that exist outside the registry/DB system, or removing commands from the database that have empty/null `repoUrl` values.

---

## Issue 3: Replace ⏳/✅/❌ reactions with 👁️

### Current reaction flow
**File**: `src/router/index.ts`

| Line(s) | Reaction | Emoji | Unicode | Purpose |
|---------|----------|-------|---------|---------|
| 275 | Loading | ⏳ | `\u23F3` | Sent when command starts |
| 329 | Success remove loading | — | — | `removeReaction(..., "\u23F3")` |
| 330 | Success reaction | ✅ | `\u2705` | Sent on success |
| 332 | Error remove loading | — | — | `removeReaction(..., "\u23F3")` |
| 333 | Error reaction | ❌ | `\u274C` | Sent on error |

### Reaction code block (lines 326-336)
```typescript
try {
    // ... command execution ...
    await client.removeReaction(messageId, senderJid, "\u23F3");
    await client.sendReaction(messageId, senderJid, "✅");
} catch (error) {
    await client.removeReaction(messageId, senderJid, "\u23F3");
    await client.sendReaction(messageId, senderJid, "❌");
    await client.sendMessage(
        senderJid,
        "❌ Something went wrong. The command may have an error.",
    );
}
```

### WAHA client reaction API
**File**: `src/gateway/waha-client.ts`

- `sendReaction()` (line 64): `PUT /api/reaction` with `{ session, messageId, reaction: emoji }`
- `removeReaction()` (line 83): `PUT /api/reaction` with `{ session, messageId, reaction: "" }` (empty string removes)

### Why 👁️ (eye emoji)?
WhatsApp may rate-limit or ban accounts that send rapid reaction emoji (quick successive reactions). The 👁️ emoji is less likely to be flagged. The user wants to replace ALL reaction emojis (⏳, ✅, ❌) with 👁️ to avoid this ban risk.

---

## Key Files Reference

| File | Lines | Relevance |
|------|-------|-----------|
| `src/commands/executor.ts` | 37, 70-101 | `Object.freeze(ctx)`, VM creation, executeCommand |
| `src/types.ts` | 104-113, 115-120 | `CommandContext` interface, `CommandDefinition` |
| `src/router/index.ts` | 275, 326-336 | Reaction flow (loading → success/error) |
| `src/gateway/waha-client.ts` | 64-108 | `sendReaction`, `removeReaction` WAHA API |
| `src/commands/demo.ts` | 1-63 | Demo commands (no repo backing) |
| `src/commands/registry.ts` | 1-500+ | Command registry, repoUrl fields |
| `src/commands/routes.ts` | 1-70 | API routes for command registration |
| `src/db/schema.ts` | 89-103 | `commands` table with `repo_url` field |
| `test/commands/demo.test.ts` | 1-128 | Unit tests for demo commands |
| `test/utils/mocks.ts` | 1-80 | `MockWahaClient` for testing reactions |

---

## Constraints & Invariants

1. **`Object.freeze(ctx)` is intentional** — security boundary to prevent sandbox escape. Any fix must preserve sandbox isolation.
2. **Reactions are non-critical** — `waha-client.ts` lines 79-81 and 98-100 have `// Don't throw for reactions` comments; reaction failures are silently logged.
3. **`removeReaction` sends `reaction: ""`** — WAHA API convention for reaction removal, not a bug.
4. **Commands are sandboxed via vm2** — `vm2` is configured with `eval: false`, `wasm: false`, and globals blocked.
5. **`CommandContext` properties are readonly by design** — `userId`, `args`, `message`, `contactId` should not be modifiable by command code.
6. **Demo commands are isolated from production** — not imported in router, not in DB, only used in tests.

---

## Risks & Unknowns

1. **Shallow freeze**: `Object.freeze()` only freezes the top-level object. If ctx contains nested objects (it doesn't currently, but `args` is an array which is still mutable), commands could mutate nested state. Consider `Object.freeze()` vs `structuredClone` vs deep freeze.

2. **Array mutation**: `ctx.args` is an array. `Object.freeze()` doesn't prevent `ctx.args.push()` or `ctx.args[0] = "x"`. If commands need to read args without mutation risk, consider `Object.freeze({ ...ctx.args })` or returning a readonly copy.

3. **Demo command removal scope**: Unclear whether "remove test commands without a repo" means:
   - Delete `src/commands/demo.ts` entirely?
   - Add `repoUrl` to demo commands?
   - Filter out commands with null `repoUrl` in the registry?
   - Remove from DB records that have empty `repoUrl`?

4. **Eye emoji compatibility**: The 👁️ emoji (U+1F441) is widely supported but should be verified against WAHA's emoji handling. Some WAHA versions may have emoji encoding issues.

5. **Test impact**: Changing reaction emojis will break existing integration tests in `test/integration/router.test.ts` that implicitly rely on the reaction flow (even if not explicitly asserting emoji values).
