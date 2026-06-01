## Context

The Akka WhatsApp bot platform has accumulated several critical bugs that prevent core functionality from working. Most are simple omissions (missing `.run()` calls) that cause silent failures. One is a race condition in user installation creation. Another causes incorrect UI display in marketplace.

Current state:
- `uninstallCommand()` and `renameInstallation()` build queries but never execute them
- `installCommand()` queries all installations to find the last inserted ID (inefficient + race condition)
- Marketplace checks `userSlug` against `slug` for installed status
- Executor timeout race causes unhandled rejections
- Hardcoded credentials in admin routes and developer routes
- No cleanup for expired data

## Goals / Non-Goals

**Goals:**
- Fix all critical bugs that cause data integrity issues
- Ensure database operations actually execute
- Fix marketplace installed status display
- Make hardcoded values configurable via environment
- Add cleanup jobs for expired data accumulation

**Non-Goals:**
- Refactoring or optimization beyond bug fixes
- Adding new features
- Changing API contracts

## Decisions

### D1: Use `.returning().get()` for inserts

**Decision**: Replace the "insert then query all to find last" pattern with `.returning().get()`.

**Rationale**: 
- Avoids race condition where another insert could happen between insert and query
- More efficient (one query instead of two)
- Drizzle ORM supports this pattern directly
- Already used correctly in some places (e.g., `admin/routes.ts:44`)

**Alternative considered**: Query by ID after insert - still has race condition.

### D2: Add `.run()` to update/delete queries

**Decision**: Add `.run()` call to all update and delete queries that are currently missing it.

**Rationale**:
- Drizzle's fluent API builds queries but doesn't execute until `.run()` or `.get()` is called
- Simple fix, no architectural change needed

### D3: Fix marketplace installed check by commandId

**Decision**: Track installed commands by `commandId` instead of comparing slugs.

**Rationale**:
- `userSlug` is the custom name the user assigned (e.g., "myremind")
- `cmd.slug` is the original command slug (e.g., "remind")
- These don't match when user renamed the installation
- `commandId` is the authoritative link between installation and command

**Implementation**: Build a Set of installed commandIds for the user/contact, then check against that.

### D4: Fix executor timeout with proper promise handling

**Decision**: Use `Promise.race` with a wrapped timeout that cleans up properly.

**Rationale**:
- Current code creates timeout promise that rejects but never clears the timer if main promise wins
- Unhandled rejection if timeout fires after completion
- Need to clear timeout after race completes

### D5: Environment variables for hardcoded values

**Decision**: Move hardcoded values to environment variables with sensible defaults.

**Values to extract**:
- `ADMIN_TOKEN` (default: "admin-token" for dev, must be set in prod)
- `WHATSAPP_LOGIN_PHONE` (default: current hardcoded number)

### D6: Add cleanup job to Scheduler

**Decision**: Extend the Scheduler to run periodic cleanup of expired records.

**Tables to clean**:
- `conversation_flows` where `expiresAt < now`
- `registration_tokens` where `expiresAt < now` and `used = false`
- `sessions` older than 30 days (optional, keep for now)

**Implementation**: Add a `startCleanup()` method that runs hourly.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Breaking existing behavior | Run existing test suite after fixes |
| Cleanup job deletes data users might want | Only delete clearly expired records with `expiresAt` |
| Environment variable not set in production | Use defaults in dev, log warning if using default in prod-like env |

## Migration Plan

1. Deploy bug fixes (no migration needed - fixes are backward compatible)
2. Set `ADMIN_TOKEN` environment variable in production before deploy
3. Set `WHATSAPP_LOGIN_PHONE` if different from default
4. Cleanup job runs automatically on next scheduler start

## Open Questions

None - all bugs have clear fixes.
