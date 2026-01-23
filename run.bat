@echo off
start /d "./api" node app.js
start /d "./webapp" npm run dev
