## Why

Multiple critical bugs prevent core platform functionality from working correctly. The most severe bugs cause database operations to silently fail (uninstall/rename never execute), race conditions in user installation creation, and incorrect installation status display in marketplace. These bugs directly impact user experience and data integrity.

## What Changes

- Fix `uninstallCommand()` missing `.run()` call - delete query never executes
- Fix `renameInstallation()` missing `.run()` call - update query never executes
- Fix `installCommand()` race condition - use `.returning().get()` instead of querying all installations
- Fix marketplace `installed` check comparing wrong field (userSlug vs slug)
- Fix executor timeout race causing unhandled promise rejections
- Add hardcoded values to environment configuration (admin token, WhatsApp phone)
- Add cleanup jobs for expired flows, tokens, and sessions

## Capabilities

### New Capabilities

- `cleanup-jobs`: Periodic cleanup of expired conversation flows, registration tokens, and old sessions

### Modified Capabilities

None - these are bug fixes, not requirement changes.

## Impact

- `src/router/user-service.ts`: Fix uninstall, rename, install methods
- `src/commands/marketplace.ts`: Fix installed status check
- `src/commands/executor.ts`: Fix timeout race handling
- `src/admin/routes.ts`: Move admin token to env
- `src/developer/routes.ts`: Move WhatsApp phone to env
- `src/gateway/session-manager.ts`: Reduce duplicate health checks
- `src/scheduler/index.ts`: Add cleanup job scheduling
