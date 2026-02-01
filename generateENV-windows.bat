@echo off

echo Generating env files
if not exist .env (
    echo Generating .env
    type nul > .env
    copy .env.example .env
) else (
    echo .env exists
)

if not exist .env.production (
    echo Generating .env.production
    type nul > .env.production
    copy .env.production.example .env.production
) else (
    echo .env.production exists
)

if not exist .env.secret (
    echo Generating .env.secret
    type nul > .env.secret
    copy .env.secret.example .env.secret
) else (
    echo .env.secret exists
)

if not exist .env.secret.production (
    echo Generating .env.secret.production
    type nul > .env.secret.production
    copy .env.secret.production.example .env.secret.production
) else (
    echo .env.secret.production exists
)