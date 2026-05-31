# ============================================================
# Stage 1: Install dependencies & build frontend dashboards
# ============================================================
FROM oven/bun:1.2 AS builder

WORKDIR /app

# Build dependencies for native modules (better-sqlite3)
RUN apt-get update -qq && \
    apt-get install -y -qq --no-install-recommends \
    build-essential python3 && \
    rm -rf /var/lib/apt/lists/*

# 1. Copy dependency manifests first (layer caching)
COPY package.json bun.lock ./
COPY admin-ui/package.json admin-ui/bun.lock ./admin-ui/
COPY developer-ui/package.json developer-ui/bun.lock ./developer-ui/

# 2. Install ALL dependencies (root + UIs)
RUN bun install --frozen-lockfile --cwd /app
RUN bun install --frozen-lockfile --cwd /app/admin-ui
RUN bun install --frozen-lockfile --cwd /app/developer-ui

# 3. Copy full source tree
COPY . .

# 4. Build frontend dashboards
RUN cd admin-ui && bun run build
RUN cd developer-ui && bun run build

# 5. Copy built assets into server static directories
RUN cp -r admin-ui/dist/* src/admin/static/ && \
    cp -r developer-ui/dist/* src/developer/static/

# ============================================================
# Stage 2: Production image — slim, runtime-only
# ============================================================
FROM oven/bun:1.2 AS runner

WORKDIR /app

RUN apt-get update -qq && \
    apt-get install -y -qq --no-install-recommends curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy built artifacts only (node_modules, compiled src, static files)
COPY --from=builder /app .

# Named volume for persistent SQLite database
VOLUME [ "/app/data" ]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

COPY scripts/migrate.ts ./scripts/migrate.ts
COPY scripts/start.sh ./scripts/start.sh
RUN chmod +x ./scripts/start.sh

CMD ["./scripts/start.sh"]
