@echo off
setlocal ENABLEEXTENSIONS
set SCRIPT=%~dp0deploy.ps1

echo.
echo Iniciando deploy...

if not exist "%SCRIPT%" (
  echo No se encontro: %SCRIPT%
  echo.
  echo Pulsa una tecla para cerrar...
  pause >nul
  exit /b 1
)

rem Si hay argumentos, pasalos como mensaje. Si no, ejecuta sin -Message (usa el valor por defecto del ps1).
if "%~1"=="" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" -Message "%*"
)

echo.
echo Pulsa una tecla para cerrar...
pause >nul
