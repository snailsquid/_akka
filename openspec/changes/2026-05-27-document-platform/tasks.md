## 1. Project Setup

- [x] 1.1 Initialize Bun project with TypeScript
- [x] 1.2 Install dependencies: hono, drizzle-orm, better-sqlite3, vm2
- [x] 1.3 Create project structure: src/{gateway,router,commands,scheduler,admin,developer,db}
- [x] 1.4 Configure Drizzle with SQLite
- [x] 1.5 Set up Hono HTTP server

## 2. Database Schema

- [x] 2.1 Create contacts table (id, name, phone_number, waha_session_id)
- [x] 2.2 Create users table (id, phone_jid, anonymized_id, created_at)
- [x] 2.3 Create developers table (id, whatsapp_jid, username, created_at)
- [x] 2.4 Create developer_groups table (id, name, created_at)
- [x] 2.5 Create developer_group_members table (group_id, developer_id)
- [x] 2.6 Create commands table (id, developer_id, slug, name, description, usage, repo_url, entry_point, status)
- [x] 2.7 Create installations table (id, user_id, contact_id, command_id, user_slug, installed_at)
- [x] 2.8 Create scheduled_tasks table (id, user_id, contact_id, command_slug, payload, execute_at, status)
- [x] 2.9 Create registration_tokens table (id, token, developer_id, used, created_at)
- [x] 2.10 Create conversation_flows table (id, user_id, contact_id, flow_type, state, data, expires_at)
- [x] 2.11 Create sessions table (id, token, developer_id, created_at)
- [x] 2.12 Generate and run initial migration

## 3. WhatsApp Gateway

- [x] 3.1 Implement Waha client (send message, send reaction, remove reaction)
- [x] 3.2 Create webhook endpoint for receiving messages
- [x] 3.3 Extract sender JID, contact JID, message body, message ID from webhook
- [x] 3.4 Map Waha session to contact ID
- [x] 3.5 Implement session health check

## 4. User Management

- [x] 4.1 Implement user lookup by WhatsApp JID
- [x] 4.2 Implement auto-create user on first message
- [x] 4.3 Implement anonymized ID generation (hash of phone JID)
- [x] 4.4 Implement installation CRUD (install, uninstall, check) with user_slug
- [x] 4.5 Implement rename installation
- [x] 4.6 Implement developer registration via WhatsApp tokens
- [x] 4.7 Implement developer-to-WhatsApp JID linking with collision checks

## 5. Message Router

- [x] 5.1 Implement command parsing (.command-slug args...) with freeform slugs
- [x] 5.2 Implement installation check before execution
- [x] 5.3 Implement system command detection (.help, .marketplace, .uninstall, .rename)
- [x] 5.4 Implement loading reaction on command receipt
- [x] 5.5 Implement reaction cleanup after execution
- [x] 5.6 Implement error handling with reaction change
- [x] 5.7 Implement conversation flow state machine (flow interruption protection)
- [x] 5.8 Implement flow timeout (60 seconds)
- [x] 5.9 Implement flow management API (start, update, end, check)

## 6. Command Registry

- [x] 6.1 Implement GitHub repo fetcher
- [x] 6.2 Implement command export validator (name, description, usage, handle)
- [x] 6.3 Implement local code caching with TTL
- [x] 6.4 Implement cache refresh logic (periodic refresh loop)
- [x] 6.5 Implement slug uniqueness check per developer
- [x] 6.6 Implement repository-based registration (multi-command repos)
- [x] 6.7 Implement all-or-nothing validation for repository registration
- [x] 6.8 Implement repository refresh (detect added, updated, disabled commands)
- [x] 6.9 Implement repository deletion
- [x] 6.10 Implement developer-username/slug ID model

## 7. Command Executor (Sandbox)

- [x] 7.1 Set up vm2 sandbox
- [x] 7.2 Implement ctx object injection (send, react, schedule, fetch, userId, args, message, contactId)
- [x] 7.3 Implement 5-second execution timeout
- [x] 7.4 Implement error catching and logging
- [x] 7.5 Implement network restriction (ctx.fetch proxies through Bun's fetch)
- [x] 7.6 Test sandbox isolation (verify fs/process/env blocked)

## 8. Command SDK

- [x] 8.1 Create @akka/sdk package structure
- [x] 8.2 Implement command() helper function
- [x] 8.3 Export CommandContext and CommandDefinition types
- [x] 8.4 Implement send, react, schedule, fetch stubs (platform injects real implementations)
- [x] 8.5 Add TypeScript types for all APIs
- [x] 8.6 Create SDK README with usage examples

## 9. System Commands

- [x] 9.1 Implement .help command (list installed commands on current contact)
- [x] 9.2 Implement .marketplace command (delegates to marketplace handler)
- [x] 9.3 Implement .uninstall command (remove installation)
- [x] 9.4 Implement .rename command (rename installed slug)
- [x] 9.5 Implement .login command (authenticate developer via token)
- [x] 9.6 Implement error messages for unknown/uninstalled commands

## 10. Marketplace

- [x] 10.1 Implement marketplace listing with pagination (5 per page, n/p navigation)
- [x] 10.2 Implement text-based command selection by number
- [x] 10.3 Implement already-installed indication in listings
- [x] 10.4 Implement install confirmation with usage info
- [x] 10.5 Implement slug collision handling (replace vs new)
- [x] 10.6 Implement flow state management for marketplace interactions

## 11. Scheduler

- [x] 11.1 Implement SQLite-backed task storage
- [x] 11.2 Implement duration parser (10m, 2h, 30s)
- [x] 11.3 Implement scheduler poll loop (every 30s)
- [x] 11.4 Implement task execution and status update
- [x] 11.5 Implement restart recovery (resume pending tasks)
- [x] 11.6 Implement task failure handling (log and continue)

## 12. Developer Portal

- [x] 12.1 Create developer authentication (session-based bearer token)
- [x] 12.2 Create registration token generation (web portal, 10-minute expiry)
- [x] 12.3 Create WhatsApp registration flow (.login <token>)
- [x] 12.4 Create repository registration API (POST /developer/repos)
- [x] 12.5 Create repository management (list, refresh, delete)
- [x] 12.6 Create command analytics endpoint (install count, unique contacts)
- [x] 12.7 Deprecate legacy command endpoints (return 410)
- [x] 12.8 Create developer web dashboard (React/Vite)

## 13. Admin Portal

- [x] 13.1 Create _akka admin authentication (token-based)
- [x] 13.2 Create contact management API (CRUD for WhatsApp contacts)
- [x] 13.3 Create session status dashboard (connected/disconnected)
- [x] 13.4 Create admin web dashboard (React/Vite)

## 14. Group Chat Support

- [x] 14.1 Handle messages from group chats (identify group JID vs individual JID)
- [x] 14.2 Route group messages to correct contact

## 15. Integration & Testing

- [x] 15.1 Set up Waha Docker container in docker-compose.yml
- [x] 15.2 Configure first WhatsApp contact number via admin portal
- [x] 15.3 End-to-end test: developer registers, adds command, user installs and uses
- [x] 15.4 End-to-end test: marketplace browsing and text-based installation
- [x] 15.5 End-to-end test: .remind with scheduler
- [x] 15.6 End-to-end test: slug collision handling (replace vs new)
- [x] 15.7 Error handling review and edge cases
- [x] 15.8 Create demo commands (.remind, .echo, .translate)
- [x] 15.9 Create unit tests (Bun test) for commands, registry, scheduler, gateway, router, SDK
- [x] 15.10 Create integration tests for marketplace handler, router, server
- [x] 15.11 Create Playwright E2E tests for marketplace API, admin dashboard, developer dashboard
