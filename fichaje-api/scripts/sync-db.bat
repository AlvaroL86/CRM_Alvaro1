@echo off
REM No usar delayed expansion para no romper contraseñas con "!"
setlocal ENABLEEXTENSIONS DISABLEDELAYEDEXPANSION

REM === Cliente MySQL 8.0 (ajusta si tu ruta es distinta) ===
set "MYSQL_BIN=C:\mysql80\mysql-8.0.43-winx64\bin"
set "PATH=%MYSQL_BIN%;%PATH%"

REM ===== Local =====
set "LOCAL_HOST=127.0.0.1"
set "LOCAL_PORT=3307"
set "LOCAL_USER=root"
set "LOCAL_PASS="           REM Si tu MySQL local tiene password, ponla aquí
set "DB_LOCAL=fichaje_crm"

REM ===== Remoto (AlwaysData) =====
set "REMOTE_HOST=mysql-fidelitysoporte.alwaysdata.net"
set "REMOTE_PORT=3306"
set "REMOTE_USER=430157_crmuser"
set "DB_REMOTE=fidelitysoporte_crm"

REM ===== Archivos =====
set "DUMP_LOCAL=dump_local.sql"
set "BACKUP_REMOTE=backup_remote_antes.sql"
set "HDR=_import_header.sql"
set "FTR=_import_footer.sql"

echo.
echo === Cliente en uso ===
mysql --version
echo.

REM --- Test LOCAL ---
echo [1/6] Test LOCAL %LOCAL_USER%@%LOCAL_HOST%:%LOCAL_PORT%
if "%LOCAL_PASS%"=="" (
  mysql -h %LOCAL_HOST% -P %LOCAL_PORT% -u %LOCAL_USER% -e "SELECT 1;" || goto :err_local
) else (
  mysql -h %LOCAL_HOST% -P %LOCAL_PORT% -u %LOCAL_USER% --password="%LOCAL_PASS%" -e "SELECT 1;" || goto :err_local
)

REM --- Test REMOTO (pide password) ---
echo [2/6] Test REMOTO %REMOTE_USER%@%REMOTE_HOST%:%REMOTE_PORT%  (te pedirá la contraseña)
mysql -h %REMOTE_HOST% -P %REMOTE_PORT% -u %REMOTE_USER% -p -e "SELECT 1;" || goto :err_remote

REM --- Backup REMOTO (pide password) ---
echo [3/6] Backup REMOTO %DB_REMOTE% -> %BACKUP_REMOTE%  (te pedirá la contraseña)
mysqldump -h %REMOTE_HOST% -P %REMOTE_PORT% -u %REMOTE_USER% -p ^
  --single-transaction --routines --triggers --events ^
  --default-character-set=utf8mb4 --set-gtid-purged=OFF --column-statistics=0 --max-allowed-packet=256M ^
  %DB_REMOTE% > "%BACKUP_REMOTE%" || goto :err_backup

REM --- Dump LOCAL ---
echo [4/6] Dump LOCAL %DB_LOCAL% -> %DUMP_LOCAL%
if "%LOCAL_PASS%"=="" (
  mysqldump -h %LOCAL_HOST% -P %LOCAL_PORT% -u %LOCAL_USER% ^
    --single-transaction --routines --triggers --events ^
    --default-character-set=utf8mb4 --set-gtid-purged=OFF --column-statistics=0 --add-drop-table --max-allowed-packet=256M ^
    %DB_LOCAL% > "%DUMP_LOCAL%" || goto :err_dump
) else (
  mysqldump -h %LOCAL_HOST% -P %LOCAL_PORT% -u %LOCAL_USER% --password="%LOCAL_PASS%" ^
    --single-transaction --routines --triggers --events ^
    --default-character-set=utf8mb4 --set-gtid-purged=OFF --column-statistics=0 --add-drop-table --max-allowed-packet=256M ^
    %DB_LOCAL% > "%DUMP_LOCAL%" || goto :err_dump
)

REM --- Construir header/footer para importar sin bloqueos
echo [5/6] Preparando import tolerante a bloqueos...
> "%HDR%" echo SET SESSION innodb_lock_wait_timeout=600;
>> "%HDR%" echo SET SESSION lock_wait_timeout=600;
>> "%HDR%" echo SET FOREIGN_KEY_CHECKS=0;
>> "%HDR%" echo SET UNIQUE_CHECKS=0;
>> "%HDR%" echo SET SQL_NOTES=0;
>> "%HDR%" echo SET AUTOCOMMIT=0;

> "%FTR%" echo COMMIT;
>> "%FTR%" echo SET FOREIGN_KEY_CHECKS=1;
>> "%FTR%" echo SET UNIQUE_CHECKS=1;
>> "%FTR%" echo SET SQL_NOTES=1;

REM --- Import REMOTO (pide password)
echo [6/6] Import LOCAL -> REMOTO %DB_REMOTE%  (te pedirá la contraseña)
type "%HDR%" "%DUMP_LOCAL%" "%FTR%" | mysql -h %REMOTE_HOST% -P %REMOTE_PORT% -u %REMOTE_USER% -p --default-character-set=utf8mb4 %DB_REMOTE%
if errorlevel 1 goto :err_import

del "%HDR%" "%FTR%" 2>nul

echo.
echo ✓ OK: %DB_LOCAL% (local) -> %DB_REMOTE% (AlwaysData)
goto :fin

:err_local
echo [ERROR] No conecta a MySQL LOCAL. Revisa puerto, usuario o password local.
goto :fin

:err_remote
echo [ERROR] No conecta a MySQL REMOTO. Asegúrate de meter la contraseña correcta.
goto :fin

:err_backup
echo [ERROR] Backup REMOTO falló. ¿Contraseña correcta? ¿Permisos del usuario sobre %DB_REMOTE%?
goto :fin

:err_dump
echo [ERROR] Dump LOCAL falló. ¿Servicio MySQL local arrancado? ¿Existe la BD %DB_LOCAL%?
goto :fin

:err_import
echo [ERROR] Import REMOTO falló. Si persiste:
echo   1) Asegúrate de que la API en Render está detenida (ninguna conexión).
echo   2) Repite el import (los timeouts ya están a 600s).
echo   3) Como último recurso, vacía tablas en phpMyAdmin (Seleccionar todo -> Eliminar) y vuelve a importar.
goto :fin

:fin
echo.
pause
