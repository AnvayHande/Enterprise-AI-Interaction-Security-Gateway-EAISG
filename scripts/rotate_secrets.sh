#!/bin/bash
# Script to assist in rotating JWT secrets and API keys

set -e

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <target_env_file>"
    exit 1
fi

ENV_FILE=$1

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: File $ENV_FILE not found."
    exit 1
fi

echo "Generating new JWT_SECRET..."
# Generate a secure 32-byte hex string
NEW_JWT=$(openssl rand -hex 32)

# Use sed to replace the existing JWT_SECRET
if grep -q "^JWT_SECRET=" "$ENV_FILE"; then
    sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$NEW_JWT/" "$ENV_FILE"
else
    echo "JWT_SECRET=$NEW_JWT" >> "$ENV_FILE"
fi

echo "Successfully rotated JWT_SECRET in $ENV_FILE."
echo "NOTE: A rolling restart of all backend containers is required to pick up this change."
echo "Run: docker-compose -f docker-compose.prod.yml restart backend"
