#!/bin/bash

echo "=== Akka Landing Page & Developer Dashboard Verification ==="
echo ""
echo "⚠️  NOTE: Server must be restarted for changes to take effect"
echo ""

# Check if server is running
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Server is running on port 3000"
else
    echo "❌ Server is not responding on port 3000"
    exit 1
fi

echo ""
echo "=== Checking Endpoints ==="

# Check root endpoint
echo -n "Root (/) endpoint: "
RESPONSE=$(curl -s http://localhost:3000/)
if echo "$RESPONSE" | grep -q "BUILD.*COMMANDS.*WHATSAPP"; then
    echo "✅ Landing page is serving correctly"
elif echo "$RESPONSE" | grep -q '"status":"ok"'; then
    echo "⚠️  Still serving old health check (restart needed)"
else
    echo "❓ Unknown response"
fi

# Check developer endpoint
echo -n "Developer (/developer/) endpoint: "
RESPONSE=$(curl -s http://localhost:3000/developer/)
if echo "$RESPONSE" | grep -q "Akka Developer Dashboard"; then
    echo "✅ Developer dashboard is serving"
else
    echo "❌ Developer dashboard not found"
fi

# Check health endpoint
echo -n "Health (/health) endpoint: "
RESPONSE=$(curl -s http://localhost:3000/health)
if echo "$RESPONSE" | grep -q '"status":"ok"'; then
    echo "✅ Health endpoint responding"
elif [ "$RESPONSE" = "404 Not Found" ]; then
    echo "⚠️  Returns 404 (restart needed)"
else
    echo "❓ Unknown response"
fi

echo ""
echo "=== Checking Built Assets ==="

# Check landing static files
if [ -f "src/landing/static/index.html" ]; then
    echo "✅ Landing page built (src/landing/static/)"
else
    echo "❌ Landing page not built"
fi

# Check developer static files
if [ -f "src/developer/static/index.html" ]; then
    echo "✅ Developer dashboard built (src/developer/static/)"
else
    echo "❌ Developer dashboard not built"
fi

echo ""
echo "=== Next Steps ==="
echo ""
echo "To activate all changes:"
echo "  1. Stop the current server: sudo kill $(pgrep -f 'bun.*index.ts')"
echo "  2. Restart: bun run dev"
echo "  3. Visit: http://localhost:3000/"
echo ""
echo "Expected URLs:"
echo "  - http://localhost:3000/           → Landing page"
echo "  - http://localhost:3000/developer  → Developer portal"
echo "  - http://localhost:3000/admin      → Admin dashboard"
echo "  - http://localhost:3000/health     → Health check"
echo ""
