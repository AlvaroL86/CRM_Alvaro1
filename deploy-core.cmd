@echo off
setlocal EnableExtensions

title Deploy CRM (Git + Render + Netlify)
cd /d "%~dp0"

echo ==============================================
echo   DEPLOY: Git push + Hooks de Render/Netlify
echo   Carpeta: %CD%
echo   Fecha:   %DATE%  %TIME%
echo ==============================================
echo.

REM Mensaje opcional de commit (si no pasas, usa el por defecto)
set "MSG=%*"
if "%MSG%"=="" set "MSG=chore: deploy"

REM ------ Cargar variables de .deploy.env (opcional) ------
REM Ignora lineas que empiezan con # y permite valores con '='
if exist ".deploy.env" (
  echo [INFO] Cargando .deploy.env ...
  for /f "usebackq eol=# tokens=1,* delims==" %%A in (".deploy.env") do (
    if not "%%A"=="" (
      set "%%A=%%B"
    )
  )
) else (
  echo [INFO] No hay .deploy.env (se omitiran los hooks si no estan en el entorno).
)

call :DeployRepo "crm-fichajes" "%MSG%"
call :DeployRepo "fichaje-api"   "%MSG%"

echo.

REM ------ Disparo de hooks ------
set "USE_PS=0"
where curl >nul 2>nul || set "USE_PS=1"

if defined NETLIFY_BUILD_HOOK_URL (
  echo --> Netlify hook: %NETLIFY_BUILD_HOOK_URL%
  if "%USE_PS%"=="0" (
    curl -s -X POST "%NETLIFY_BUILD_HOOK_URL%" >nul && echo [OK] Netlify hook enviado. || echo [WARN] Fallo Netlify hook.
  ) else (
    powershell -NoProfile -Command "try { Invoke-RestMethod -Method Post -Uri $env:NETLIFY_BUILD_HOOK_URL | Out-Null; 0 } catch { 1 }" | find "1" >nul && (echo [WARN] Fallo Netlify hook.) || (echo [OK] Netlify hook enviado.)
  )
) else (
  echo [INFO] NETLIFY_BUILD_HOOK_URL no definido.
)

if defined RENDER_DEPLOY_HOOK_URL (
  echo --> Render hook: %RENDER_DEPLOY_HOOK_URL%
  if "%USE_PS%"=="0" (
    curl -s -X POST "%RENDER_DEPLOY_HOOK_URL%" >nul && echo [OK] Render hook enviado. || echo [WARN] Fallo Render hook.
  ) else (
    powershell -NoProfile -Command "try { Invoke-RestMethod -Method Post -Uri $env:RENDER_DEPLOY_HOOK_URL | Out-Null; 0 } catch { 1 }" | find "1" >nul && (echo [WARN] Fallo Render hook.) || (echo [OK] Render hook enviado.)
  )
) else (
  echo [INFO] RENDER_DEPLOY_HOOK_URL no definido.
)

echo.
echo ===== FIN DEL DEPLOY =====
echo.
pause
exit /b

:DeployRepo
set "REPO=%~1"
set "CMSG=%~2"

if not exist "%REPO%" (
  echo [WARN] No existe repo: %REPO%
  goto :eof
)

pushd "%REPO%"
echo.
echo [REPO] %CD%

where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git no esta en PATH. Instala Git o abre Git Bash.
  popd
  goto :eof
)

git add -A
git diff --cached --quiet
if errorlevel 1 (
  echo - Commit: %CMSG%
  git commit -m "%CMSG%"
  if errorlevel 1 (echo [WARN] commit fallo.) else echo [OK] commit hecho.
) else (
  echo - No hay cambios a commitear.
)

echo - Push...
git push
if errorlevel 1 (echo [ERROR] push fallo.) else echo [OK] push hecho.

popd
goto :eof
