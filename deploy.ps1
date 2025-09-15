param(
  [string]$Message = "chore: deploy"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSCommandPath
Set-Location $root

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "DEPLOY: Git push + optional hooks (Render/Netlify)"
Write-Host ("Folder : {0}" -f (Get-Location))
Write-Host ("Date   : {0}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"))
Write-Host "======================================================" -ForegroundColor Cyan

# Load .deploy.env if present
$envFile = Join-Path $root ".deploy.env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*#') { return }
    if ($_ -match '^\s*$') { return }
    $kv = $_ -split '=', 2
    if ($kv.Count -eq 2) {
      [Environment]::SetEnvironmentVariable($kv[0].Trim(), $kv[1].Trim(), "Process")
    }
  }
}

# Ensure git is available
try { git --version | Out-Null } catch {
  Write-Host "[ERROR] Git not found in PATH. Install Git or open Git Bash." -ForegroundColor Red
  exit 1
}

# Stage
git add -A

# Commit if there are staged files
$staged = git diff --cached --name-only
if ([string]::IsNullOrWhiteSpace($staged)) {
  Write-Host "No staged changes."
} else {
  git commit -m $Message
  Write-Host "Commit done."
}

# Push
git push
Write-Host "Push done."

# Optional hooks
if ($env:NETLIFY_BUILD_HOOK_URL) {
  Write-Host "Triggering Netlify hook..."
  try {
    Invoke-RestMethod -Method POST -Uri $env:NETLIFY_BUILD_HOOK_URL | Out-Null
    Write-Host "Netlify hook sent."
  } catch {
    Write-Host ("Netlify hook failed: {0}" -f $_.Exception.Message) -ForegroundColor Red
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
    Write-Host ("Render hook failed: {0}" -f $_.Exception.Message) -ForegroundColor Red
  }
} else {
  Write-Host "RENDER_DEPLOY_HOOK_URL not set."
}

Write-Host ""
Write-Host "DONE."
