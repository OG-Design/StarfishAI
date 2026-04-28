@echo off
echo Syncing env files...

REM --- Sync .env and .env.production to webapp ---
if exist .env (
    echo Copying .env to webapp\
    copy /Y .env webapp\.env >nul
) else (
    echo WARNING: .env not found, skipping webapp sync
)

if exist .env.production (
    echo Copying .env.production to webapp\
    copy /Y .env.production webapp\.env.production >nul
) else (
    echo WARNING: .env.production not found, skipping webapp sync
)

REM --- Sync all env files to app-compose ---
if exist .env (
    echo Copying .env to app-compose\
    copy /Y .env app-compose\.env >nul
) else (
    echo WARNING: .env not found, skipping app-compose sync
)

if exist .env.production (
    echo Copying .env.production to app-compose\
    copy /Y .env.production app-compose\.env.production >nul
) else (
    echo WARNING: .env.production not found, skipping app-compose sync
)

if exist .env.secret (
    echo Copying .env.secret to app-compose\
    copy /Y .env.secret app-compose\.env.secret >nul
) else (
    echo WARNING: .env.secret not found, skipping app-compose sync
)

if exist .env.secret.production (
    echo Copying .env.secret.production to app-compose\
    copy /Y .env.secret.production app-compose\.env.secret.production >nul
) else (
    echo WARNING: .env.secret.production not found, skipping app-compose sync
)

echo Env sync complete.
