## Why

The Akka WhatsApp automation platform has been fully implemented across 15 SDD phases, but the change artifacts were archived without a clean, consolidated retrospective change that documents the actual delivered state. This retrospective SDD change captures the complete platform as it exists in the codebase — all capabilities, specs, and tasks — creating a single source of truth for what was built.

## What Changes

This is a **retrospective documentation** of the fully implemented Akka platform. No code changes are made; this SDD change captures the existing implementation as OpenSpec artifacts.

### Capabilities Delivered

| # | Capability | Source File | Status |
|---|-----------|-------------|--------|
| 1 | `whatsapp-gateway` | `src/gateway/waha-client.ts`, `src/gateway/webhook.ts`, `src/gateway/session-manager.ts` | Implemented |
| 2 | `message-router` | `src/router/index.ts` | Implemented |
| 3 | `user-management` | `src/router/user-service.ts`, `src/db/schema.ts` (users, installations) | Implemented |
| 4 | `command-registry` | `src/commands/registry.ts` | Implemented |
| 5 | `command-executor` | `src/commands/executor.ts` | Implemented |
| 6 | `command-sdk` | `src/commands/sdk/index.ts`, `src/commands/sdk/package.json`, `src/commands/sdk/README.md` | Implemented |
| 7 | `marketplace` | `src/commands/marketplace.ts` | Implemented |
| 8 | `scheduler` | `src/scheduler/index.ts`, `src/scheduler/parser.ts` | Implemented |
| 9 | `system-commands` | `src/commands/system.ts` | Implemented |
| 10 | `admin-portal` | `src/admin/routes.ts` | Implemented |
| 11 | `developer-portal` | `src/developer/routes.ts` | Implemented |

### Architecture

```
WAHA (Docker) ←→ Webhook ←→ src/gateway/webhook.ts ←→ src/router/index.ts
                                                    ↓
                                         src/commands/registry.ts
                                                    ↓
                                         src/commands/executor.ts (vm2 sandbox)
                                                    ↓
                                         src/commands/marketplace.ts
                                                    ↓
                                         src/scheduler/index.ts
                                                    ↓
                                         src/commands/system.ts
                                                    ↓
                                         src/admin/routes.ts (admin portal API)
                                         src/developer/routes.ts (dev portal API)
                                                    ↓
                                         src/db/schema.ts (SQLite + Drizzle)
```

### Technology Stack

- **Runtime**: Bun
- **HTTP Framework**: Hono
- **Database**: SQLite via `better-sqlite3` with Drizzle ORM
- **Sandbox**: `vm2` for command execution isolation
- **Frontend**: React + Vite (admin-ui, developer-ui)
- **WhatsApp**: WAHA (DevLikeAPro) Docker container
- **Tests**: Bun unit tests + Playwright E2E tests

### Impact

- No code changes
- No new dependencies
- Creates SDD artifacts for the completed platform
- Enables future changes to build on this baseline

## Capabilities

### New Capabilities
All capabilities listed above are **new** — this is a greenfield platform.

### Modified Capabilities
None — this is a retrospective capture, not a modification.

## Scope

**In scope:**
- All 11 capabilities as implemented in the codebase
- All database tables and relationships
- All API endpoints (REST + webhook)
- All frontend dashboards (admin, developer)
- All test coverage (unit + E2E)

**Out of scope:**
- No new features or code changes
- No changes to existing OpenSpec archive
- No infrastructure or deployment changes
