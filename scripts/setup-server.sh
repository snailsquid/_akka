#!/bin/bash
set -euo pipefail

# ════════════════════════════════════════════════════
# Initial server setup — run ONCE on Hetzner
# ════════════════════════════════════════════════════
#
# Migrates from the old /root/_akka/ layout to the
# new /root/akka/ Docker Compose stack with named volumes.
#
# ════════════════════════════════════════════════════

NEW_DIR="/root/akka"
OLD_DIR="/root/_akka"

echo "═══════════════════════════════════════════"
echo " Akka — Hetzner Server Setup"
echo "═══════════════════════════════════════════"

# ── 1. Create new deployment directory ────────────
echo "▸ Creating $NEW_DIR..."
mkdir -p "$NEW_DIR/data/waha/sessions"

# ── 2. Copy WAHA data from old layout (if exists) ──
if [ -d "$OLD_DIR/data/waha" ]; then
  echo "▸ Migrating WAHA data from $OLD_DIR/data/waha..."
  cp -r "$OLD_DIR/data/waha/." "$NEW_DIR/data/waha/"
  echo "  ✓ WAHA data migrated"
else
  echo "  ℹ No old WAHA data found"
fi

# ── 3. Stop old containers ────────────────────────
echo "▸ Stopping old containers..."
if [ -f "$OLD_DIR/docker-compose.yml" ]; then
  cd "$OLD_DIR" && docker compose down --remove-orphans 2>/dev/null || true
fi
# Also stop any orphan containers with the same names
docker rm -f akka-waha 2>/dev/null || true
docker rm -f akka 2>/dev/null || true
echo "  ✓ Old containers stopped"

# ── 4. Migrate Akka SQLite DB to named volume ────
echo "▸ Migrating Akka database..."
if [ -f "$OLD_DIR/data/akka.db" ]; then
  # Create a temporary container to copy the DB into the named volume
  docker volume create akka-data 2>/dev/null || true
  docker run --rm \
    -v akka-data:/target \
    -v "$OLD_DIR/data:/source" \
    alpine sh -c "cp -r /source/* /target/ && chmod 755 /target && ls -la /target/"
  echo "  ✓ Database migrated to akka-data volume"
else
  docker volume create akka-data 2>/dev/null || true
  echo "  ℹ No existing database — created empty volume"
fi

# ── 5. Delete old deploy (user confirmed) ────────
echo "▸ Old deploy at $OLD_DIR can now be removed."
echo "  Run: rm -rf $OLD_DIR"
echo ""

# ── 6. Print next steps ───────────────────────────
echo "═══════════════════════════════════════════"
echo " Setup complete! Next steps:"
echo ""
echo "  1. Copy docker-compose.yml to server:"
echo "     scp docker-compose.yml hetzner:$NEW_DIR/"
echo ""
echo "  2. Log in to GHCR and deploy:"
echo "     ssh hetzner"
echo "     cd $NEW_DIR"
echo "     echo \$GHCR_TOKEN | docker login ghcr.io -u <user> --password-stdin"
echo "     docker compose pull"
echo "     docker compose up -d"
echo ""
echo "  3. Verify:"
echo "     curl http://localhost:3000/"
echo "═══════════════════════════════════════════"
