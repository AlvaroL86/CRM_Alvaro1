param(
  [string]$Message = "chore: deploy"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSCommandPath

function Write-Header {
  Write-Host "======================================================"
  Write-Host "DEPLOY: Git push + optional hooks (Render / Netlify)"
  Write-Host ("Carpeta: {0}" -f $root)
  Write-Host ("Fecha:   {0}" -f (Get-Date))
  Write-Host "======================================================"
}

# --- Carga .deploy.env si existe (KEY=VALUE por linea) ---
$envFile = Join-Path $root ".deploy.env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*#') { return }
    if ($_ -match '^\s*$') { return }
    $parts = $_ -split '=', 2
    if ($parts.Count -eq 2) {
      $name  = $parts[0].Trim()
      $value = $parts[1].Trim()
      [System.Environment]::SetEnvironmentVariable($name, $value)
    }
  }
}

function Deploy-Repo([string]$path) {
  if (-Not (Test-Path $path)) {
    Write-Host "No existe: $path"
    return
  }
  Push-Location $path
  try {
    Write-Host ""
    Write-Host ("Repo: {0}" -f $path)
    git add -A

    $staged = git diff --cached --name-only
    if ([string]::IsNullOrWhiteSpace($staged)) {
      Write-Host "No hay cambios para commit."
    } else {
      git commit -m $Message
      Write-Host "Commit done."
    }

    git push
    Write-Host "Push done."
  } finally {
    Pop-Location
  }
}

Write-Header

# --- 1) Frontend ---
Deploy-Repo (Join-Path $root "crm-fichajes")
# --- 2) Backend ---
Deploy-Repo (Join-Path $root "fichaje-api")

# --- 3) Hooks de deploy ---
if ($env:NETLIFY_BUILD_HOOK_URL) {
  Write-Host "Triggering Netlify hook..."
  try {
    Invoke-RestMethod -Method POST -Uri $env:NETLIFY_BUILD_HOOK_URL | Out-Null
    Write-Host "Netlify hook sent."
  } catch {
    Write-Host ("Netlify hook ERROR: {0}" -f $_.Exception.Message)
  }
} else {
  Write-Host "NETLIFY_BUILD_HOOK_URL not set."
}

if ($env:RENDER_DEPLOY_HOOK_URL) {
  Write-Host "Triggering Render hook..."
  try {
    Invoke-RestMethod -Method POST -Uri $env:RENDER_DEPLOY_HOOK_URL | Out-Null
    Write-Host "Render hook sent."
  } catch {
    Write-Host ("Render hook ERROR: {0}" -f $_.Exception.Message)
  }
} else {
  Write-Host "RENDER_DEPLOY_HOOK_URL not set."
}

Write-Host ""
Write-Host "DONE."
