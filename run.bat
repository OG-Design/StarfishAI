@echo off

start /d "./redis" docker-compose up -d
start /d "./ollama" docker-compose up -d

start /d "./api-nest" npm run start:dev
start /d "./webapp" npm run dev
