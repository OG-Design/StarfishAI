#!/bin/sh
set -e

# On Windows (Git Bash), ensure openssl is in PATH
if [ -d "/c/Program Files/Git/usr/bin" ]; then
    export PATH="/c/Program Files/Git/usr/bin:$PATH"
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CERT_FILE="$SCRIPT_DIR/cert.pem"
KEY_FILE="$SCRIPT_DIR/key.pem"

if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
    echo "SSL certificates already exist:"
    echo "  $CERT_FILE"
    echo "  $KEY_FILE"
    echo "To regenerate, delete them first."
    exit 0
fi

echo "Generating self-signed SSL certificate..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$KEY_FILE" -out "$CERT_FILE" \
    -subj "/CN=localhost"

echo "SSL certificates generated:"
echo "  $CERT_FILE"
echo "  $KEY_FILE"
