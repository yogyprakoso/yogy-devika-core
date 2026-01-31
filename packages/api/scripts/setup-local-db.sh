#!/usr/bin/env bash

# Setup local DynamoDB tables
# Run this after starting DynamoDB with: pnpm run db:start

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.." || exit

. ../../scripts/project-variables.sh

ENDPOINT="http://localhost:8000"

echo "Setting up local DynamoDB tables..."
echo "Endpoint: $ENDPOINT"
echo ""

# Check if DynamoDB is running
if ! curl -s "$ENDPOINT" > /dev/null 2>&1; then
    echo "Error: DynamoDB local is not running!"
    echo "Start it with: pnpm run db:start"
    exit 1
fi

# Create admin table
TABLE_NAME="${APP_NAME}-local-admin"
echo "Creating table: $TABLE_NAME"
aws dynamodb create-table \
    --endpoint-url "$ENDPOINT" \
    --table-name "$TABLE_NAME" \
    --attribute-definitions AttributeName=userSub,AttributeType=S \
    --key-schema AttributeName=userSub,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --no-cli-pager 2>/dev/null || echo "  Table already exists"

# Create room table
TABLE_NAME="${APP_NAME}-local-room"
echo "Creating table: $TABLE_NAME"
aws dynamodb create-table \
    --endpoint-url "$ENDPOINT" \
    --table-name "$TABLE_NAME" \
    --attribute-definitions AttributeName=roomCode,AttributeType=S \
    --key-schema AttributeName=roomCode,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --no-cli-pager 2>/dev/null || echo "  Table already exists"

# Create participant table (composite key)
TABLE_NAME="${APP_NAME}-local-participant"
echo "Creating table: $TABLE_NAME"
aws dynamodb create-table \
    --endpoint-url "$ENDPOINT" \
    --table-name "$TABLE_NAME" \
    --attribute-definitions \
        AttributeName=roomCode,AttributeType=S \
        AttributeName=odv,AttributeType=S \
    --key-schema \
        AttributeName=roomCode,KeyType=HASH \
        AttributeName=odv,KeyType=RANGE \
    --billing-mode PAY_PER_REQUEST \
    --no-cli-pager 2>/dev/null || echo "  Table already exists"

# Seed local admin user
echo ""
echo "Seeding admin user..."
aws dynamodb put-item \
    --endpoint-url "$ENDPOINT" \
    --table-name "${APP_NAME}-local-admin" \
    --item '{"userSub": {"S": "local-dev-user-'$(whoami)'"}, "userEmail": {"S": "local@dev.com"}}' \
    --no-cli-pager 2>/dev/null

echo ""
echo "Done! Tables:"
aws dynamodb list-tables --endpoint-url "$ENDPOINT" --output table --no-cli-pager
