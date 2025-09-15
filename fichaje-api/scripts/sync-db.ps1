#Requires -Version 5
param(
  [string]$EnvFile = "../.env",   # ruta a tu .env del backend
  [string]$DumpFile = "dump_fichaje_crm.sql"
)

Write-Host "`n=== Sync DB Local -> AlwaysData ===`n"

function Get-EnvVar([string]$name, [string]$default="") {
  if (Test-Path $EnvFile) {
    $line = (Get-Content $EnvFile) | Where-Object { $_ -match "^\s*$name\s*=" } | Select-Object -First 1
    if ($line) {
      $value = $line -replace "^\s*$name\s*=\s*", ""
      return $value.Trim('"').Trim("'")
    }
  }
  return $default
}

# Lee del .env (ajusta si usas variables diferentes para prod)
$LocalHost  = Get-EnvVar "DB_HOST"   "127.0.0.1"
$LocalPort  = Get-EnvVar "DB_PORT"   "3306"
$LocalUser  = Get-EnvVar "DB_USER"   "root"
$DbName     = Get-EnvVar "DB_NAME"   "fichaje_crm"

# Pide contraseñas en ejecución (no se guardan en disco)
$LocalPass  = Read-Host "Password LOCAL ($LocalUser@$LocalHost)" -AsSecureString
$RemoteHost = Read-Host "Host REMOTO AlwaysData (ej. mysql-xxxx.alwaysdata.net)"
$RemotePort = Read-Host "Puerto REMOTO" 
if (-not $RemotePort) { $RemotePort = "3306" }
$RemoteUser = Read-Host "Usuario REMOTO"
$RemotePass = Read-Host "Password REMOTO" -AsSecureString

# Convierte SecureString para pasarlo a mysqldump/mysql (solo en memoria)
$ptr1 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($LocalPass)
$LocalPassPlain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr1)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr1)

$ptr2 = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($RemotePass)
$RemotePassPlain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr2)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr2)

# Export
Write-Host "`n-> Exportando $DbName desde $LocalHost:$LocalPort ..."
$dumpCmd = @(
  "mysqldump",
  "-h", $LocalHost,
  "-P", $LocalPort,
  "-u", $LocalUser,
  "-p$LocalPassPlain",
  "--single-transaction",
  "--routines", "--triggers", "--events",
  "--default-character-set=utf8mb4",
  "--set-gtid-purged=OFF",
  $DbName
)
$dump = Start-Process -FilePath $dumpCmd[0] -ArgumentList $dumpCmd[1..($dumpCmd.Count-1)] -NoNewWindow -PassThru -RedirectStandardOutput $DumpFile -Wait
if ($dump.ExitCode -ne 0) {
  Write-Host "[ERROR] Fallo al exportar. ¿Clientes MySQL en PATH? ¿Credenciales ok?"
  exit 1
}

# Import
Write-Host "-> Importando en $RemoteHost:$RemotePort ..."
$importCmd = @(
  "mysql",
  "-h", $RemoteHost,
  "-P", $RemotePort,
  "-u", $RemoteUser,
  "-p$RemotePassPlain",
  "--default-character-set=utf8mb4"
)
# Redirige el dump al stdin de mysql
$typeProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c type `"$DumpFile`" | " + ($importCmd -join " ") -NoNewWindow -Wait -PassThru
if ($typeProc.ExitCode -ne 0) {
  Write-Host "[ERROR] Fallo al importar en AlwaysData. Revisa host/usuario/clave/red."
  exit 1
}

Write-Host "`n✓ Sincronización completada: $DbName (local -> AlwaysData)"
