# Meta-Prompt: Akka Bot Fix — Three Parallel Tasks

## Goal
Implement three independent fixes in the Akka WhatsApp bot platform:

1. **Fix `TypeError: Attempted to assign to readonly property`** — Commands executed via vm2 that mutate `ctx` throw because `executor.ts` line 37 does `Object.freeze(ctx)`. Determine the correct approach: either make ctx properties mutable while preserving sandbox safety, or handle the error gracefully in the router.

2. **Remove test commands that don't have a repo** — Demo commands in `src/commands/demo.ts` exist outside the registry/DB system. Determine what "remove" means: delete the file? Add repoUrl? Filter in queries? Clarify with context before acting.

3. **Replace ⏳/✅/❌ reactions with 👁️** — In `src/router/index.ts` lines 326-336, replace all reaction emoji (loading: ⏳, success: ✅, error: ❌) with the eye emoji (👁️ / U+1F441) to avoid WhatsApp ban from quick reactions.

---

## Context / Evidence

### Issue 1: readonly property error
- **File**: `src/commands/executor.ts`, line 37: `return Object.freeze(ctx);`
- **Interface**: `src/types.ts` lines 104-113 — `CommandContext` has `readonly` on `userId`, `args`, `message`, `contactId`
- **Execution path**: `router.handleIncomingMessage()` → `executeCommandCmd()` → `createExecutionContext()` → `Object.freeze(ctx)` → `executeCommand()` → `vm.run()` with frozen ctx
- **vm2 config** (`executor.ts` line 74): `eval: false`, `wasm: false`, `allowAsync: true`, `fixAsync: true`
- **Sandbox safety**: `vm.freeze(ctx, "ctx")` at line 77 — double freeze (JS freeze + vm2 freeze)
- **Demo commands** (`src/commands/demo.ts`) don't modify ctx, so tests pass
- **Real commands** from GitHub repos may try to modify ctx properties → TypeError
- **Error handling**: `router/index.ts` lines 332-336 catches the error and shows error message, but the TypeError itself is the problem

### Issue 2: test commands without repo
- **Location**: `src/commands/demo.ts` — three `CommandDefinition` objects (echo, remind, translate)
- **No repoUrl**: These are standalone objects, not backed by GitHub repos
- **Not in production flow**: Not imported in `src/router/index.ts` or `src/server.ts`
- **Only used in tests**: `test/commands/demo.test.ts` imports and tests them directly
- **Registry**: `src/commands/registry.ts` only handles GitHub-backed commands with `repoUrl`
- **DB schema**: `commands` table requires `repo_url TEXT NOT NULL`

### Issue 3: reaction emoji replacement
- **Current flow**: `src/router/index.ts` lines 275, 326-336
  - Loading: `"\u23F3"` (⏳)
  - Success: `"✅"`
  - Error: `"❌"`
- **WAHA client**: `src/gateway/waha-client.ts` — reactions use `PUT /api/reaction`
- **removeReaction**: Sends `reaction: ""` (empty string) to remove

---

## Success Criteria

1. **No `TypeError: Attempted to assign to readonly property`** thrown during command execution. The fix must either:
   - Allow commands to run without the freeze blocking them (while keeping sandbox isolation), OR
   - Handle the error gracefully so the bot doesn't crash
   - Commands should still be sandboxed — no escape from vm2

2. **Test commands without repo are cleaned up** — either removed from codebase or filtered from all queries/outputs. No dead code paths referencing demo commands outside tests.

3. **All reaction emojis replaced with 👁️** — loading, success, and error reactions all use the eye emoji. No ⏳, ✅, or ❌ in reaction calls.

4. **All existing tests pass** — `bun test` must succeed after changes.

---

## Hard Constraints

- **Do not remove sandbox isolation** — vm2 must still protect against command code escaping the sandbox
- **Do not remove `Object.freeze()` entirely without a replacement** — if ctx mutability is the issue, the fix must be targeted
- **Reactions are non-critical** — `waha-client.ts` already treats reaction failures as non-throwing (see lines 79-81, 98-100). Changes should not make reactions critical.
- **No changes to database schema** for these three fixes
- **Demo commands in tests must still work** if they're kept — but if removed from source, update tests accordingly

---

## Suggested Approach

### Task 1 (readonly property):
1. Run `bun test` to reproduce the error and identify which test/command triggers it
2. Determine if the freeze is needed for sandbox security or if it's overly restrictive
3. If commands need to work: consider removing `Object.freeze()` from `createExecutionContext` but keeping `vm.freeze(ctx, "ctx")` in the VM, or use a targeted approach (freeze only the properties that must be readonly)
4. If the error is from external commands in production: ensure the router handles it gracefully (it already does in the catch block)
5. Add or update tests to verify the fix

### Task 2 (demo commands without repo):
1. Confirm demo commands are only used in `test/commands/demo.test.ts`
2. If they serve no production purpose: delete `src/commands/demo.ts` and update test imports
3. If they're referenced elsewhere: add a filter in `registry.ts` to exclude commands without `repoUrl`
4. Run `bun test` to verify no broken imports

### Task 3 (reaction emoji):
1. In `src/router/index.ts`, replace:
   - Line 275: `"\u23F3"` → `"👁️"` (loading)
   - Line 330: `"✅"` → `"👁️"` (success)
   - Line 333: `"❌"` → `"👁️"` (error)
2. Update `removeReaction` calls to match the new loading emoji
3. Consider if the eye emoji should also be used for the error message prefix (line 335) — likely not, as that's text, not a reaction
4. Update any test assertions that check reaction emoji values

---

## Validation

Run `bun test` and verify all tests pass. Specifically:
- `test/commands/demo.test.ts` — demo command tests (may need updates if demo.ts is deleted)
- `test/integration/router.test.ts` — router tests (may need reaction emoji updates)
- `test/commands/system.test.ts` — system command tests
- `test/integration/marketplace-handler.test.ts` — marketplace tests
- `test/commands/registry.test.ts` — registry tests

Quick check: `grep -rn "sendReaction\|removeReaction" src/` — verify all reaction calls use 👁️ or the new loading emoji.

---

## Resolved Questions and Assumptions

### Resolved
- The `Object.freeze()` call is at `executor.ts:37` and is the source of the TypeError
- Reaction flow is in `router/index.ts` lines 326-336, with loading at line 275
- Demo commands are standalone `CommandDefinition` objects with no repoUrl, no DB records, no production imports
- WAHA `removeReaction` sends empty string, not a special API call

### Assumptions
- The "test-repo-commands" error refers to commands executed through the repo-based command system, not a specific file named "test-repo-commands"
- "Remove test commands without a repo" means cleaning up the demo commands that exist outside the registry system
- The eye emoji replacement should be consistent across all three states (loading, success, error)
- Tests will need updates to match new emoji values, but test logic (reaction flow, error handling) remains the same
