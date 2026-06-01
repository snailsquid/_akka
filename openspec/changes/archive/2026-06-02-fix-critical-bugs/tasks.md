## 1. Fix User Service Database Operations

- [x] 1.1 Fix `uninstallCommand()` - add `.run()` call and return based on changes count
- [x] 1.2 Fix `renameInstallation()` - add `.run()` call and return based on changes count
- [x] 1.3 Fix `installCommand()` - use `.returning().get()` instead of querying all installations
- [x] 1.4 Add unit tests for uninstall returning correct boolean
- [x] 1.5 Add unit tests for rename returning correct boolean

## 2. Fix Marketplace Installed Status

- [x] 2.1 Update `buildInitialState()` to track installed by commandId
- [x] 2.2 Update `showPage()` to check installed by commandId
- [x] 2.3 Add unit test for renamed command showing as installed
- [x] 2.4 Add unit test for normal installed status display

## 3. Fix Executor Timeout Race

- [x] 3.1 Refactor `executeCommand()` to properly handle timeout race
- [x] 3.2 Clear timeout after promise settles
- [x] 3.3 Add unit test for timeout behavior

## 4. Move Hardcoded Values to Environment

- [x] 4.1 Add `ADMIN_TOKEN` env var to admin routes auth
- [x] 4.2 Add `WHATSAPP_LOGIN_PHONE` env var to developer routes
- [x] 4.3 Add warning log when using default admin token in production

## 5. Add Cleanup Jobs

- [x] 5.1 Add `cleanupExpiredFlows()` method to delete expired conversation flows
- [x] 5.2 Add `cleanupExpiredTokens()` method to delete expired unused registration tokens
- [x] 5.3 Add `startCleanup()` method to Scheduler with hourly interval
- [x] 5.4 Call `startCleanup()` in `main()` during startup
- [x] 5.5 Add `CLEANUP_INTERVAL_MS` environment variable support
- [x] 5.6 Add unit tests for cleanup methods

## 6. Verification

- [x] 6.1 Run full test suite (`bun run test`)
- [x] 6.2 Verify uninstall actually deletes records
- [x] 6.3 Verify rename actually updates records
- [x] 6.4 Verify marketplace shows correct installed status
