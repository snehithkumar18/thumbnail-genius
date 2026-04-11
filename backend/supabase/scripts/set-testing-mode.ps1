param(
  [ValidateSet('on','off')]
  [string]$Mode,

  [string]$ProjectRef = 'jmdvwkolahvabnisawev',
  [string]$SupabaseExe = 'C:\Users\NEHITH\.supabase\bin\supabase.exe',
  [string]$SupabaseAccessToken = '',
  [string]$BackendEnvFile = 'backend/supabase/.env.local'
)

$ErrorActionPreference = 'Stop'

if (-not $Mode) {
  throw "Missing -Mode. Use: -Mode on or -Mode off"
}

if (-not (Test-Path $SupabaseExe)) {
  throw "Supabase CLI not found at $SupabaseExe"
}

if (-not $SupabaseAccessToken) {
  if (Test-Path $BackendEnvFile) {
    $tokenLine = Get-Content $BackendEnvFile | Where-Object { $_ -match '^\s*SUPABASE_ACCESS_TOKEN\s*=' } | Select-Object -First 1
    if ($tokenLine) {
      $SupabaseAccessToken = ($tokenLine -replace '^\s*SUPABASE_ACCESS_TOKEN\s*=\s*', '').Trim().Trim('"').Trim("'")
    }
  }
}

if (-not $SupabaseAccessToken) {
  throw 'SUPABASE_ACCESS_TOKEN not provided and not found in backend/supabase/.env.local'
}

$env:SUPABASE_ACCESS_TOKEN = $SupabaseAccessToken

$enable = if ($Mode -eq 'on') { 'true' } else { 'false' }

Write-Host "Setting testing mode '$Mode' for project $ProjectRef..."
& $SupabaseExe secrets set BYPASS_CREDITS=$enable BYPASS_PLAN_CHECKS=$enable --project-ref $ProjectRef

Write-Host ''
Write-Host 'Testing mode update completed.'
Write-Host "BYPASS_CREDITS=$enable"
Write-Host "BYPASS_PLAN_CHECKS=$enable"
Write-Host ''
Write-Host 'Tip: re-run smoke with a fresh JWT to verify endpoints:'
Write-Host './backend/supabase/scripts/remote-smoke.ps1 -UserJwt "<fresh_access_token>"'
