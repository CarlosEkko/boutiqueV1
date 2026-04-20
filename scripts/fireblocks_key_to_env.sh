#!/bin/bash
# Convert a Fireblocks PEM secret key to a single-line value suitable for .env file.
# Usage: ./fireblocks_key_to_env.sh [path-to-key]
#        (defaults to ./backend/fireblocks_secret.key)
#
# Output: a line to append to your .env file:
#   FIREBLOCKS_SECRET_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
#
# After adding to .env, restart docker:
#   sudo docker compose down && sudo docker compose up -d

set -e

KEY_FILE="${1:-./backend/fireblocks_secret.key}"

if [ ! -f "$KEY_FILE" ]; then
    echo "ERROR: file not found: $KEY_FILE" >&2
    exit 1
fi

if [ -d "$KEY_FILE" ]; then
    echo "ERROR: '$KEY_FILE' is a DIRECTORY (likely created by Docker bind-mount)." >&2
    echo "Fix: sudo rm -rf '$KEY_FILE' and provide the original PEM file before running this script." >&2
    exit 1
fi

# Replace actual newlines with literal \n for .env
ESCAPED=$(awk '{printf "%s\\n", $0}' "$KEY_FILE")

echo "# Add the following line to your .env file:"
echo ""
echo "FIREBLOCKS_SECRET_KEY=\"$ESCAPED\""
echo ""
echo "# Then restart:"
echo "#   sudo docker compose down && sudo docker compose up -d"
