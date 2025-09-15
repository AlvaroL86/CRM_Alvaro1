@echo off
cd /d "%~dp0"
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy.ps1" -Message %*
echo.
echo Press any key to close...
pause >nul
