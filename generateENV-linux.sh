#!/bin/bash
echo "Generating env files"
if [ ! -e .env ]; then
    echo "Generating .env"
    touch .env
    cp .env.example .env
else
    echo ".env exists"
fi

if [ ! -e .env.production ]; then
    echo "Generating .env.production"
    touch .env.production
    cp .env.production.example .env.production
else
    echo ".env.production exists"
fi

if [ ! -e .env.secret ]; then
    echo "Generating .env.secret"
    touch .env.secret
    cp .env.secret.example .env.secret
else
    echo ".env.secret exists"
fi

if [ ! -e .env.secret.production ]; then
    echo "Generating .env.secret.production"
    touch .env.secret.production
    cp .env.secret.production.example .env.secret.production
else
    echo ".env.secret.production exists"
fi