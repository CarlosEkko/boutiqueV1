#!/bin/bash
# ============================================================
# KBEX VPS Diagnostic Script - Sumsub & 2FA
# Execute no VPS: bash diagnostic.sh
# ============================================================

echo "=========================================="
echo "KBEX VPS DIAGNOSTIC - SUMSUB & 2FA"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check Environment Variables
echo -e "\n${YELLOW}[1] Checking Environment Variables...${NC}"
cd /app/backend 2>/dev/null || cd ~/kbex/backend 2>/dev/null || echo "Could not find backend directory"

if [ -f .env ]; then
    if grep -q "SUMSUB_APP_TOKEN" .env; then
        SUMSUB_TOKEN=$(grep "SUMSUB_APP_TOKEN" .env | cut -d'=' -f2)
        if [ -n "$SUMSUB_TOKEN" ] && [ "$SUMSUB_TOKEN" != "" ]; then
            echo -e "${GREEN}✓ SUMSUB_APP_TOKEN is configured${NC}"
        else
            echo -e "${RED}✗ SUMSUB_APP_TOKEN is empty${NC}"
        fi
    else
        echo -e "${RED}✗ SUMSUB_APP_TOKEN not found in .env${NC}"
    fi
    
    if grep -q "SUMSUB_SECRET_KEY" .env; then
        SUMSUB_SECRET=$(grep "SUMSUB_SECRET_KEY" .env | cut -d'=' -f2)
        if [ -n "$SUMSUB_SECRET" ] && [ "$SUMSUB_SECRET" != "" ]; then
            echo -e "${GREEN}✓ SUMSUB_SECRET_KEY is configured${NC}"
        else
            echo -e "${RED}✗ SUMSUB_SECRET_KEY is empty${NC}"
        fi
    else
        echo -e "${RED}✗ SUMSUB_SECRET_KEY not found in .env${NC}"
    fi
    
    if grep -q "SUMSUB_LEVEL_NAME" .env; then
        echo -e "${GREEN}✓ SUMSUB_LEVEL_NAME is configured${NC}"
    else
        echo -e "${YELLOW}⚠ SUMSUB_LEVEL_NAME not found (using default: basic-kyc-level)${NC}"
    fi
else
    echo -e "${RED}✗ .env file not found in backend directory${NC}"
fi

# 2. Check Python Dependencies
echo -e "\n${YELLOW}[2] Checking Python Dependencies...${NC}"
if python3 -c "import pyotp" 2>/dev/null; then
    echo -e "${GREEN}✓ pyotp is installed${NC}"
else
    echo -e "${RED}✗ pyotp is NOT installed - Run: pip install pyotp${NC}"
fi

if python3 -c "import qrcode" 2>/dev/null; then
    echo -e "${GREEN}✓ qrcode is installed${NC}"
else
    echo -e "${RED}✗ qrcode is NOT installed - Run: pip install qrcode[pil]${NC}"
fi

# 3. Check Backend Logs for Errors
echo -e "\n${YELLOW}[3] Checking Backend Logs for Errors...${NC}"
if [ -f /var/log/supervisor/backend.err.log ]; then
    SUMSUB_ERRORS=$(tail -200 /var/log/supervisor/backend.err.log | grep -i "sumsub\|401\|403\|authentication" | tail -5)
    if [ -n "$SUMSUB_ERRORS" ]; then
        echo -e "${RED}Found Sumsub-related errors:${NC}"
        echo "$SUMSUB_ERRORS"
    else
        echo -e "${GREEN}✓ No Sumsub errors in recent logs${NC}"
    fi
    
    TWOFFA_ERRORS=$(tail -200 /var/log/supervisor/backend.err.log | grep -i "2fa\|totp\|otp" | tail -5)
    if [ -n "$TWOFFA_ERRORS" ]; then
        echo -e "${RED}Found 2FA-related errors:${NC}"
        echo "$TWOFFA_ERRORS"
    else
        echo -e "${GREEN}✓ No 2FA errors in recent logs${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Log file not found at /var/log/supervisor/backend.err.log${NC}"
fi

# 4. Test API Endpoints
echo -e "\n${YELLOW}[4] Testing API Endpoints...${NC}"
API_URL="https://app.kbex.io"  # Adjust if different

# Test Sumsub config
echo "Testing Sumsub config endpoint..."
SUMSUB_RESP=$(curl -s -w "\n%{http_code}" "$API_URL/api/sumsub/config")
HTTP_CODE=$(echo "$SUMSUB_RESP" | tail -1)
BODY=$(echo "$SUMSUB_RESP" | sed '$d')

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✓ /api/sumsub/config returns 200${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}✗ /api/sumsub/config returns $HTTP_CODE${NC}"
    echo "Response: $BODY"
fi

# 5. Check Frontend Build
echo -e "\n${YELLOW}[5] Checking Frontend for Sumsub SDK...${NC}"
cd /app/frontend 2>/dev/null || cd ~/kbex/frontend 2>/dev/null

if [ -d node_modules/@sumsub ]; then
    echo -e "${GREEN}✓ @sumsub/websdk-react is in node_modules${NC}"
else
    echo -e "${RED}✗ @sumsub/websdk-react NOT found - Run: npm install @sumsub/websdk-react${NC}"
fi

# 6. Summary
echo -e "\n=========================================="
echo "SUMMARY & RECOMMENDED ACTIONS"
echo "=========================================="
echo "
If Sumsub is not working:
1. Ensure SUMSUB_APP_TOKEN and SUMSUB_SECRET_KEY are in backend/.env
2. Get credentials from: https://cockpit.sumsub.com/ 
3. Rebuild and restart: docker-compose down && docker-compose up -d --build

If 2FA is not working:
1. Install pyotp: pip install pyotp qrcode[pil]
2. Restart backend: supervisorctl restart backend

After changes, check logs:
tail -f /var/log/supervisor/backend.err.log
"
