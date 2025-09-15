@echo off
REM No usar delayed expansion para no romper contraseñas con "!"
setlocal ENABLEEXTENSIONS DISABLEDELAYEDEXPANSION

REM === Cliente MySQL 8.0 (ajusta si tu ruta es distinta) ===
set "MYSQL_BIN=C:\mysql80\mysql-8.0.43-winx64\bin"
set "PATH=%MYSQL_BIN%;%PATH%"

REM ===== Remoto (AlwaysData) =====
set "REMOTE_HOST=mysql-fidelitysoporte.alwaysdata.net"
set "REMOTE_PORT=3306"
set "REMOTE_USER=430157_crmuser"
set "DB_REMOTE=fidelitysoporte_crm"

REM ===== Local =====
set "LOCAL_HOST=127.0.0.1"
set "LOCAL_PORT=3307"
set "LOCAL_USER=root"
set "LOCAL_PASS="             REM Si tu MySQL local tiene password, ponla aquí
set "DB_LOCAL=fichaje_crm"

REM ===== Archivos =====
set "DUMP_REMOTE=dump_remote.sql"
set "BACKUP_LOCAL=backup_local_antes.sql"
set "HDR=_import_header.sql"
set "FTR=_import_footer.sql"

echo.
echo === Cliente en uso ===
mysql --version
echo.

REM --- Test REMOTO (te pedirá la contraseña) ---
echo [1/6] Test REMOTO %REMOTE_USER%@%REMOTE_HOST%:%REMOTE_PORT%
mysql -h %REMOTE_HOST% -P %REMOTE_PORT% -u %REMOTE_USER% -p -e "SELECT 1;" || goto :err_remote

REM --- Backup LOCAL antes de pisar nada ---
echo [2/6] Backup LOCAL %DB_LOCAL% -> %BACKUP_LOCAL%
if "%LOCAL_PASS%"=="" (
  mysqldump -h %LOCAL_HOST% -P %LOCAL_PORT% -u %LOCAL_USER% ^
    --single-transaction --routines --triggers --events ^
    --default-character-set=utf8mb4 --set-gtid-purged=OFF --column-statistics=0 --add-drop-table ^
    %DB_LOCAL% > "%BACKUP_LOCAL%" || goto :err_backup_local
) else (
  mysqldump -h %LOCAL_HOST% -P %LOCAL_PORT% -u %LOCAL_USER% --password="%LOCAL_PASS%" ^
    --single-transaction --routines --triggers --events ^
    --default-character-set=utf8mb4 --set-gtid-purged=OFF --column-statistics=0 --add-drop-table ^
    %DB_LOCAL% > "%BACKUP_LOCAL%" || goto :err_backup_local
)

REM --- Dump REMOTO (te pedirá la contraseña) ---
echo [3/6] Dump REMOTO %DB_REMOTE% -> %DUMP_REMOTE%
mysqldump -h %REMOTE_HOST% -P %REMOTE_PORT% -u %REMOTE_USER% -p ^
  --single-transaction --routines --triggers --events ^
  --default-character-set=utf8mb4 --set-gtid-purged=OFF --column-statistics=0 --add-drop-table --max-allowed-packet=256M ^
  %DB_REMOTE% > "%DUMP_REMOTE%" || goto :err_dump_remote

REM --- Asegurar que existe la BD local ---
echo [4/6] Creando BD LOCAL si no existe: %DB_LOCAL%
if "%LOCAL_PASS%"=="" (
  echo CREATE DATABASE IF NOT EXISTS %DB_LOCAL% DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; | ^
  mysql -h %LOCAL_HOST% -P %LOCAL_PORT% -u %LOCAL_USER% || goto :err_create_local
) else (
  echo CREATE DATABASE IF NOT EXISTS %DB_LOCAL% DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; | ^
  mysql -h %LOCAL_HOST% -P %LOCAL_PORT% -u %LOCAL_USER% --password="%LOCAL_PASS%" || goto :err_create_local
)

REM --- Preparar import robusto (menos bloqueos) ---
echo [5/6] Preparando import LOCAL...
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

REM --- Importar en LOCAL ---
echo [6/6] Import REMOTO -> LOCAL %DB_LOCAL%
if "%LOCAL_PASS%"=="" (
  type "%HDR%" "%DUMP_REMOTE%" "%FTR%" | mysql -h %LOCAL_HOST% -P %LOCAL_PORT% -u %LOCAL_USER% --default-character-set=utf8mb4 %DB_LOCAL% || goto :err_import_local
) else (
  type "%HDR%" "%DUMP_REMOTE%" "%FTR%" | mysql -h %LOCAL_HOST% -P %LOCAL_PORT% -u %LOCAL_USER% --password="%LOCAL_PASS%" --default-character-set=utf8mb4 %DB_LOCAL% || goto :err_import_local
)

del "%HDR%" "%FTR%" 2>nul

echo.
echo ✓ OK: %DB_REMOTE% (AlwaysData) -> %DB_LOCAL% (local)
goto :fin

:err_remote
echo [ERROR] No conecta a MySQL REMOTO. Asegúrate de meter la contraseña correcta.
goto :fin

:err_backup_local
echo [ERROR] Backup LOCAL falló. ¿Servicio MySQL local ok? ¿Existe la BD %DB_LOCAL%?
goto :fin

:err_dump_remote
echo [ERROR] Dump REMOTO falló. ¿Contraseña correcta? ¿Permisos del usuario sobre %DB_REMOTE%?
goto :fin

:err_create_local
echo [ERROR] No pude crear/usar la BD LOCAL %DB_LOCAL%.
goto :fin

:err_import_local
echo [ERROR] Import LOCAL falló. Revisa el mensaje anterior.
goto :fin

:fin
echo.
pause
