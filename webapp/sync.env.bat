@echo off
REM Sync .env from root to webapp/.env
copy "..\\.env" ".env" /Y
echo Synced .env from root to webapp/.env