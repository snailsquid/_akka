# Validation and Risks

## Issue 1: `TypeError: Attempted to assign to readonly property`

### Root Cause Analysis

1. **`Object.freeze(ctx)` in `executor.ts:56`** — The `createExecutionContext` method freezes the `CommandContext` object before returning it. Any attempt to mutate any property on `ctx` throws in strict mode.

2. **`CommandContext` type (`types.ts`)** has `readonly` modifiers on:
   - `readonly userId: string` (line 27)
   - `readonly args: string[]` (line 28)
   - `readonly message: string` (line 29)
   - `readonly contactId: number` (line 30)

3. **Double-freeze in sandbox**: `executor.ts:67` — `vm.freeze(ctx, "ctx");` freezes `ctx` again inside the VM sandbox. Combined with the `Object.freeze` at creation time, the context is deeply frozen before commands touch it.

### How the Error Surfaces in "test-repo-commands"

The flow for executing an installed command:

1. `router/index.ts:executeCommandCmd` (line 275) creates context and calls `commandExecutor.executeCommand`
2. `executor.ts:createExecutionContext` (line 56) returns `Object.freeze(ctx)`
3. `executor.ts:createVM` (line 67) calls `vm.freeze(ctx, "ctx")` again
4. The sandboxed code runs — if any command source does `ctx.property = value` or `ctx.args.push(...)`, it throws `TypeError: Attempted to assign to readonly property`

**Probable triggers**:
- A command that calls `ctx.args.push(...)` or `ctx.something = ...` — the frozen context prevents all mutations
- A command that does `ctx.send = ...` or `ctx.react = ...` to override functions
- The `vm2` sandbox's `vm.freeze` may interact badly with `Object.freeze` when the object crosses the sandbox boundary

### Failure Modes

| Failure Mode | Likelihood | Impact |
|---|---|---|
| Command tries `ctx.args.push()` (common in user code) | High | TypeError crashes command |
| Command tries `ctx.react = customFn` | Medium | TypeError crashes command |
| vm2 `freeze` double-freeze edge case | Low | Unpredictable behavior |
| Command does `Object.assign(ctx, ...)` | Medium | TypeError crashes command |

### Evidence Needed

- What command source triggers the error? Look at `test/` fixtures or the actual repo being tested.
- Run with `vm.freeze` line commented → does the error go away? If so, it's the double-freeze.
- Run with `Object.freeze(ctx)` removed but `vm.freeze` kept → if error persists, sandbox freeze is enough.
- Check if `vm.freeze` on an already-frozen object causes issues in vm2 v3.11.3.

---

## Issue 2: Remove Test Commands Without a Repo

### Where Repo is Stored

- `schema.ts:47` — `repoUrl: text("repo_url").notNull()` — the column is non-nullable in the schema
- `routes.ts` and `registry.ts` — `repoUrl` is used in `parseGitHubUrl()`, `fetchCommandRepo()`, and `fetchManifest()`

### Where Demo Commands Live

- `src/commands/demo.ts` — Three demo commands (`echo`, `remind me`, `translate`) defined as `CommandDefinition` objects
- These are **not** stored in the database — they're pure in-memory code
- They're NOT registered via the normal `registerCommand` flow (which requires a valid GitHub URL)
- They're NOT imported or wired into the router anywhere

### How Test Commands Get Into the DB

- Test fixtures in `test/router/user-service.test.ts` insert commands via raw SQL:
  ```sql
  INSERT INTO commands (id, developer_id, slug, name, description, usage, repo_url, entry_point, status)
  VALUES (1, 1, 'test-cmd', 'Test', 'Desc', '.test', 'https://github.com/test/repo', 'index.ts', 'active')
  ```
- Integration tests (`test/integration/router.test.ts`) use `registry.registerCommand(... skipValidation: true)` to create test commands without hitting GitHub

### What "Remove Test Commands" Means

Three possible interpretations:

| Interpretation | Approach | Risk |
|---|---|---|
| **A. Filter test commands from marketplace** | Add a `WHERE status = 'active'` AND repoUrl is a real GitHub URL | Minimal — just a query filter change |
| **B. Delete test command rows from DB** | `DELETE FROM commands WHERE repoUrl LIKE '%test%' OR developerId = 0` | Could break existing tests that depend on fixture data |
| **C. Prevent registration without valid repo URL** | Enforce `repoUrl` validation at insert time, reject empty/invalid URLs | Changes the registration contract |

### High-Confidence Recommendation

**Interpretation A** — The commands table already has a `status` field. Commands without a valid repo URL should have `status = 'disabled'` or be flagged internally. The marketplace query (`getAllActiveCommands`) already filters by `status = "active"`. If test commands are inserted with `status = 'disabled'`, they naturally disappear from the marketplace.

---

## Issue 3: Replace Sandclock/Checkmark Reactions with Eye Emoji

### Current Reaction Flow

File: `router/index.ts`, `handleIncomingMessage` method (lines ~229-275):

```
1. client.sendReaction(messageId, senderJid, "\u23F3")  // ⏳ hourglass
2. <execute command>
3. client.removeReaction(messageId, senderJid, "\u23F3")  // remove hourglass
4. client.sendReaction(messageId, senderJid, "✅")        // checkmark (success path)
// OR
5. client.removeReaction(messageId, senderJid, "\u23F3")  // remove hourglass
6. client.sendReaction(messageId, senderJid, "❌")        // X mark (error path)
```

### Desired Flow

```
1. client.sendReaction(messageId, senderJid, "👁")   // 👁 eye — signals "processing" / "seen"
2. <execute command>
3. client.removeReaction(messageId, senderJid, "👁")  // remove eye (NO success/fail emoji)
```

No final success/failure reaction — just the single eye emoji that gets removed.

### Files to Change

1. **`src/router/index.ts`** (lines ~229-275):
   - Line ~235: `\u23F3` → `"👁"` (hourglass → eye)
   - Line ~273: `\u23F3` → `"👁"` (remove hourglass → remove eye)
   - Line ~274: Remove the `client.sendReaction(messageId, senderJid, "✅")` line
   - Line ~281: `\u23F3` → `"👁"` (remove in catch block)
   - Line ~282: Remove the `client.sendReaction(messageId, senderJid, "❌")` line

### WAHA API Concerns

- **`sendReaction`**: WAHA `PUT /api/reaction` with the eye emoji (`👁`) — should work for any single Unicode emoji
- **`removeReaction`**: Sends `{ reaction: "" }` (empty string). Some WAHA versions may reject this. Already has try/catch with "Don't throw" comment
- **Group chats**: `removeReaction` might fail silently in group contexts; the try/catch handles this
- **WhatsApp anti-spam**: The eye emoji is a standard Unicode emoji (U+1F441) — no special treatment needed

### Race Conditions

- `removeReaction` and final reaction are sequential — but if the first fails, the second still tries
- With the new flow (no final emoji), there's only one reaction then a removal, reducing race window
- Message might arrive before the initial reaction is processed by WAHA — the API handles this asynchronously

---

## Failure Modes Summary

| Issue | Failure Mode | Mitigation |
|---|---|---|
| 1 | Command mutates frozen ctx → TypeError | Use `Proxy` for the context instead of `Object.freeze`, or document that commands must not mutate ctx |
| 1 | vm2 double-freeze → unpredictable error | Keep only one freeze (VM `vm.freeze` is sufficient; remove the `Object.freeze` at creation time) |
| 2 | Deleting test commands breaks test fixtures | Only filter from marketplace; don't delete from DB |
| 2 | Marketplace shows non-repo commands | Add `repoUrl` validation to `getAllActiveCommands` query |
| 3 | Eye emoji doesn't render on some phones | Standard Unicode, safe — no risk |
| 3 | Missing error reaction confuses users | Intended design — eye emoji is more subtle. User explicitly asked to remove success/fail emoji |

---

## Test Strategy

### Commands to Run

```bash
# Run all tests (baseline)
cd /home/ark/Project/_akka && bun test

# Run specific test files
bun test test/commands/demo.test.ts          # Demo commands (Issue 2)
bun test test/commands/registry.test.ts      # Registry (Issue 1, 2)
bun test test/gateway/waha-client.test.ts    # WAHA reactions (Issue 3)
bun test test/router/user-service.test.ts    # User service (Issue 2)
bun test test/integration/router.test.ts     # Integration tests (all issues)
bun test test/integration/server.test.ts     # Server integration
bun test test/scheduler/index.test.ts        # Scheduler
bun test test/sdk/index.test.ts              # SDK
bun test test/db/schema.test.ts              # Schema
```

### Test Coverage Gaps

- **No test for executor with frozen context modification**: No test verifies that modifying ctx throws. Add one.
- **No test for marketplace filtering by repoUrl**: The `getAllActiveCommands` test only checks basic functionality.
- **No test for reaction failure path**: The `waha-client.test.ts` tests success paths only — no test for API rejection.
- **No test for the router's reaction flow with eye emoji**: The `handleIncomingMessage` integration test in `router.test.ts` only checks that it "doesn't throw" — doesn't verify specific reactions.

### Regression Checks

After changes, verify:
1. All tests still pass (`bun test`)
2. The `router.test.ts` integration tests handle all three paths (system command, installed command, unknown command)
3. `demo.test.ts` still works (demo commands unaffected by db changes)
4. TypeScript compiles cleanly (`bun check` or `tsc --noEmit`)

---

## Dependency Concerns

### vm2 v3.11.3
- `vm.freeze(obj, name)` is a vm2-specific API that prevents the sandbox from modifying the object name mapping
- Does NOT deep-freeze — it only prevents reassignment of the sandbox variable name
- Double-freezing (Object.freeze + vm.freeze) is safe normally, but vm2 wraps objects in proxies
- **Risk**: If vm2's internal proxy wraps the already-frozen object, the proxy's `set` trap may conflict with frozen properties

### WAHA API
- WAHA version compatibility not specified in the code
- `removeReaction` uses empty string — some WAHA versions may expect a different API (DELETE endpoint vs PUT with empty)
- No test infrastructure for real WAHA API calls
- **Risk**: Production behavior may differ from mock test behavior

### Drizzle ORM v0.45.2
- Uses `better-sqlite3` v12.10.0 (synchronous SQLite)
- Tests use in-memory databases via `createTestDb` utility
- **Risk**: Schema changes need migration generation (`drizzle-kit generate`)

---

## Escalation Rules

1. **If Object.freeze is intentional security**: Do NOT remove it. The freeze prevents sandbox-escaped code from modifying the bot's context. Instead, fix the root cause (commands that mutate ctx) or use a `Proxy` that throws a better error message.

2. **If WAHA API behavior is unclear (empty string rejection)**: Check WAHA documentation or source. The current implementation already swallows errors with "Don't throw" — this may mask a real API incompatibility.

3. **If test commands are intentionally seeded for dev**: Do NOT delete them — instead, add a `WHERE status = 'active' AND repoUrl IS NOT NULL AND repoUrl != ''` filter to marketplace queries.

4. **If a change would break existing tests**: Revert and re-evaluate. Tests are the author's validation contract.

5. **If the eye emoji (`👁`) doesn't render in WhatsApp**: Verify with WAHA version documentation. Standard Unicode emojis are generally safe.

6. **If the readonly error comes from outside the executor** (e.g., from the router accessing ctx after freeze): Trace the exact stack trace from the error report to determine which property write triggers it.

---

## meta-prompt

### Goal
Produce a validated implementation plan and code changes that:
1. Fix the `TypeError: Attempted to assign to readonly property` in test-repo-commands
2. Remove/disable test commands without a valid repo from marketplace visibility
3. Replace hourglass/checkmark/X reactions with eye emoji

### Context/Evidence
- **Executor freeze**: `src/commands/executor.ts:56` — `Object.freeze(ctx)`, line 67 — `vm.freeze(ctx, "ctx")`
- **CommandContext type**: `src/types.ts:27-30` — readonly properties
- **Reaction flow**: `src/router/index.ts:235` (hourglass), `273-274` (remove + checkmark), `281-282` (catch remove + X)
- **Schema**: `src/db/schema.ts:47` — `repoUrl` is non-nullable
- **Demo commands**: `src/commands/demo.ts` — in-memory only, not in DB
- **Test fixtures**: `test/router/user-service.test.ts` — raw SQL inserts, `test/integration/router.test.ts` — `registerCommand(skipValidation: true)`
- **WAHA client**: `src/gateway/waha-client.ts:62-119` — reaction API calls
- **Marketplace query**: `src/commands/registry.ts:546-560` — `getAllActiveCommands` filters by `status = "active"`

### Success Criteria
- [ ] `TypeError` is no longer reproducible — either the freeze approach is fixed or the command causing it is fixed
- [ ] Marketplace does not show commands with missing/invalid repo URLs
- [ ] All reaction changes use eye emoji (`👁`) consistently in router, with no leftover hourglass/checkmark/X
- [ ] All existing tests pass
- [ ] TypeScript compiles without errors

### Hard Constraints
- Do NOT remove `Object.freeze` unless you have evidence it causes the error and a different approach works
- Do NOT delete demo commands — they are in-memory code, not DB records
- Do NOT change WAHA client API signature — only the emoji values and reaction sequence logic
- Do NOT delete or alter test fixture data in a way that breaks existing tests

### Suggested Approach

**Issue 1 (Readonly property):**
1. Reproduce: write a minimal test that passes a frozen ctx to a command that does `ctx.args.push()` — verify the error
2. Two possible fixes:
   - **Option A (defensive)**: Use `Object.freeze(Object.assign({}, ctx))` with a nested-safe args copy (but args is `readonly string[]` in TypeScript, so the type is misleading)
   - **Option B (prevention)**: Keep the freeze but ensure commands don't mutate ctx — add a `Proxy` trap that throws a descriptive error instead of vm2's TypeError
   - **Option C (correct)**: Change `args: string[]` to `args: ReadonlyArray<string>` in the type and use `Object.freeze` on args too — then train commands not to mutate
3. Trace the actual command that triggers the error in the test-repo-commands flow

**Issue 2 (Test commands without repo):**
- Add a `repoUrl IS NOT NULL AND repoUrl != ''` filter to `getAllActiveCommands()` in `registry.ts`
- OR set test commands' status to `'disabled'` when they lack a valid repoUrl
- Confirm marketplace flow never returns disabled/empty-repo commands

**Issue 3 (Eye emoji):**
1. Change `\u23F3` to `"👁"` in three places in `router/index.ts`
2. Remove the two `client.sendReaction` calls for ✅ and ❌
3. Verify the catch block still removes the eye reaction
4. Run tests

### Validation
```bash
cd /home/ark/Project/_akka
bun test                                             # All tests must pass
bun test test/commands/demo.test.ts                  # Demo commands unaffected
bun test test/gateway/waha-client.test.ts             # Reaction mocks
bun test test/integration/router.test.ts              # Router flow
# Optional: add a new test that verifies:
# - frozen ctx throws on mutation
# - eye emoji is sent instead of hourglass
```

### Stop/Escalation Rules
- If the error is in a vm2 fork/version that behaves differently: stop and research
- If the fix requires removing the freeze entirely: escalate for security review
- If any test fails after changes: fix before proceeding
- If the eye emoji has different Unicode normalization in WAHA: verify with WAHA docs

### Resolved Questions
- Object.freeze is intentional — do not remove it
- Demo commands are NOT in the database — no DB changes needed for Issue 2
- Marketplace already filters by `status = "active"` — extend the filter to exclude empty/bad repo URLs
- WAHA `removeReaction` sends empty string — already has error handling
