#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.." || exit

# Load project variables
. ../../scripts/project-variables.sh

echo ""
echo "==========================================="
echo "  Starting Local Development Environment"
echo "==========================================="
echo ""

# Check if DynamoDB local is running
if curl -s "http://localhost:8000" > /dev/null 2>&1; then
    echo "[✓] DynamoDB Local is running"
    export IS_OFFLINE=true
    export DYNAMODB_ENDPOINT=http://localhost:8000
else
    echo "[!] DynamoDB Local is NOT running"
    echo "    Using AWS DynamoDB (staging) instead"
    echo ""
    echo "    To use local DynamoDB, run:"
    echo "    docker compose -f packages/api/docker-compose.yml up -d"
    echo ""
    export IS_OFFLINE=false
fi

# Set environment variables
export APP_NAME="${APP_NAME}"
export NODE_ENV=local
export API_REGION="${REGION}"
export API_CORS_ORIGIN="*"
export LOCAL_USER_SUB="local-dev-user-$(whoami)"

# Use staging Cognito (no local alternative)
echo "[i] Using AWS Cognito from staging deployment"

# Run the local server with tsx (fast TypeScript execution)
echo ""
echo "Starting Express server..."
echo ""

npx tsx watch src/local-server.ts
