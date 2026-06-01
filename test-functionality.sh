#!/bin/bash

echo "=== Akka Functionality Testing Script ==="
echo "Run this AFTER restarting the server"
echo ""

PASS=0
FAIL=0

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_endpoint() {
    local name="$1"
    local url="$2"
    local expected="$3"
    
    echo -n "Testing $name... "
    RESPONSE=$(curl -s "$url")
    
    if echo "$RESPONSE" | grep -q "$expected"; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        echo "  Expected: $expected"
        echo "  Got: ${RESPONSE:0:100}..."
        ((FAIL++))
        return 1
    fi
}

test_http_status() {
    local name="$1"
    local url="$2"
    local expected_status="$3"
    
    echo -n "Testing $name HTTP status... "
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$STATUS" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS (HTTP $STATUS)${NC}"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗ FAIL (Expected $expected_status, got $STATUS)${NC}"
        ((FAIL++))
        return 1
    fi
}

test_html_content() {
    local name="$1"
    local url="$2"
    local search_term="$3"
    
    echo -n "Testing $name contains '$search_term'... "
    RESPONSE=$(curl -s "$url")
    
    if echo "$RESPONSE" | grep -qi "$search_term"; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((FAIL++))
        return 1
    fi
}

echo "=== 1. Server Health Check ==="
test_endpoint "Health endpoint" "http://localhost:3000/health" '"status":"ok"'
echo ""

echo "=== 2. Landing Page Tests ==="
test_http_status "Landing page loads" "http://localhost:3000/" "200"
test_html_content "Landing has BUILD text" "http://localhost:3000/" "BUILD"
test_html_content "Landing has COMMANDS text" "http://localhost:3000/" "COMMANDS"
test_html_content "Landing has WHATSAPP text" "http://localhost:3000/" "WHATSAPP"
test_html_content "Landing has WhatsApp link" "http://localhost:3000/" "wa.me/6282128383086"
test_html_content "Landing has contact fallback" "http://localhost:3000/" "+6282128383086"
test_html_content "Landing has developer link" "http://localhost:3000/" "/developer"
test_html_content "Landing has Space Grotesk font" "http://localhost:3000/" "Space Grotesk"
echo ""

echo "=== 3. Developer Dashboard Tests ==="
test_http_status "Developer dashboard loads" "http://localhost:3000/developer/" "200"
test_html_content "Developer has title" "http://localhost:3000/developer/" "Akka Developer"
test_html_content "Developer has GitHub SDK link" "http://localhost:3000/developer/" "github.com/snailsquid/akka-sdk"
test_html_content "Developer has NPM link" "http://localhost:3000/developer/" "npmjs.com/package/@akka-bot/sdk"
test_html_content "Developer has Space Grotesk font" "http://localhost:3000/developer/" "Space Grotesk"
echo ""

echo "=== 4. Static Assets Tests ==="
# Check if CSS is loading
echo -n "Testing landing page CSS loads... "
CSS_URL=$(curl -s http://localhost:3000/ | grep -o '/assets/[^"]*\.css' | head -1)
if [ -n "$CSS_URL" ]; then
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$CSS_URL")
    if [ "$STATUS" = "200" ]; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASS++))
    else
        echo -e "${RED}✗ FAIL (HTTP $STATUS)${NC}"
        ((FAIL++))
    fi
else
    echo -e "${RED}✗ FAIL (CSS not found)${NC}"
    ((FAIL++))
fi

echo -n "Testing landing page JS loads... "
JS_URL=$(curl -s http://localhost:3000/ | grep -o '/assets/[^"]*\.js' | head -1)
if [ -n "$JS_URL" ]; then
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$JS_URL")
    if [ "$STATUS" = "200" ]; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASS++))
    else
        echo -e "${RED}✗ FAIL (HTTP $STATUS)${NC}"
        ((FAIL++))
    fi
else
    echo -e "${RED}✗ FAIL (JS not found)${NC}"
    ((FAIL++))
fi
echo ""

echo "=== 5. Routing Tests ==="
test_http_status "Admin dashboard still works" "http://localhost:3000/admin/" "200"
test_http_status "Developer redirect works" "http://localhost:3000/developer" "301"
test_http_status "Admin redirect works" "http://localhost:3000/admin" "301"
echo ""

echo "=== 6. Design System Verification ==="
echo -n "Checking for neo-brutalist CSS variables... "
LANDING_HTML=$(curl -s http://localhost:3000/)
if echo "$LANDING_HTML" | grep -q "Space Grotesk"; then
    echo -e "${GREEN}✓ Font loaded${NC}"
    ((PASS++))
else
    echo -e "${RED}✗ Font not found${NC}"
    ((FAIL++))
fi
echo ""

echo "=== Test Summary ==="
echo -e "Total tests: $((PASS + FAIL))"
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    echo ""
    echo "Manual verification needed:"
    echo "  1. Open http://localhost:3000/ in browser"
    echo "  2. Click WhatsApp button - should open wa.me/6282128383086"
    echo "  3. Click Developer Portal button - should navigate to /developer"
    echo "  4. Check responsive design on mobile/tablet"
    echo "  5. Verify all hover states work"
    echo "  6. Check SDK links on developer dashboard"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Review output above.${NC}"
    exit 1
fi
