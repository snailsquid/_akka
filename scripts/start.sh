#!/bin/sh
set -e

echo "[start] Running database migrations..."
bun run scripts/migrate.ts

echo "[start] Seeding default contact..."
bun run scripts/seed.ts

echo "[start] Starting Akka server..."
exec bun run src/index.ts
