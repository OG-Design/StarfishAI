#!/bin/bash
echo "Syncing env files..."

# --- Sync .env and .env.production to webapp ---
if [ -f .env ]; then
    echo "Copying .env to webapp/"
    cp .env webapp/.env
else
    echo "WARNING: .env not found, skipping webapp sync"
fi

if [ -f .env.production ]; then
    echo "Copying .env.production to webapp/"
    cp .env.production webapp/.env.production
else
    echo "WARNING: .env.production not found, skipping webapp sync"
fi

# --- Sync all env files to app-compose ---
if [ -f .env ]; then
    echo "Copying .env to app-compose/"
    cp .env app-compose/.env
else
    echo "WARNING: .env not found, skipping app-compose sync"
fi

if [ -f .env.production ]; then
    echo "Copying .env.production to app-compose/"
    cp .env.production app-compose/.env.production
else
    echo "WARNING: .env.production not found, skipping app-compose sync"
fi

if [ -f .env.secret ]; then
    echo "Copying .env.secret to app-compose/"
    cp .env.secret app-compose/.env.secret
else
    echo "WARNING: .env.secret not found, skipping app-compose sync"
fi

if [ -f .env.secret.production ]; then
    echo "Copying .env.secret.production to app-compose/"
    cp .env.secret.production app-compose/.env.secret.production
else
    echo "WARNING: .env.secret.production not found, skipping app-compose sync"
fi

echo "Env sync complete."
