@echo off

cd /d "%~dp0"

start "" "http://localhost:5500"
echo Starting Caddy server...
caddy_windows_amd64.exe file-server --listen :5500

pause