$ErrorActionPreference = 'Stop'
$projectRef = 'jmdvwkolahvabnisawev'
$supabaseExe = 'C:\Users\NEHITH\.supabase\bin\supabase.exe'
$backendEnv = '.env.local'
$frontendEnv = '..\..\frontend\.env'

$tokenLine = Get-Content $backendEnv | Where-Object { $_ -match '^\s*SUPABASE_ACCESS_TOKEN\s*=' } | Select-Object -First 1
if (-not $tokenLine) { throw 'SUPABASE_ACCESS_TOKEN not found.' }
$token = ($tokenLine -replace '^\s*SUPABASE_ACCESS_TOKEN\s*=\s*', '').Trim().Trim('"').Trim("'")
$env:SUPABASE_ACCESS_TOKEN = $token

$wantedKeys = @('FAL_KEY','GROQ_API_KEY','TOGETHER_API_KEY','GEMINI_API_KEY','DODO_SECRET_KEY','DODO_WEBHOOK_SECRET')
$secretPairs = New-Object System.Collections.Generic.List[string]
foreach ($key in $wantedKeys) {
  $line = Get-Content $frontendEnv | Where-Object { $_ -match ("^\s*" + [regex]::Escape($key) + "\s*=") } | Select-Object -First 1
  if ($line) {
    $value = ($line -replace ('^\s*' + [regex]::Escape($key) + '\s*=\s*'), '').Trim()
    $value = $value.Trim('"').Trim("'")
    if ($value) { $secretPairs.Add(("{0}={1}" -f $key, $value)) }
  }
}

$secretResult = $null
if ($secretPairs.Count -gt 0) {
  $secretOutput = & $supabaseExe secrets set @secretPairs --project-ref $projectRef --yes 2>&1
  $secretResult = [pscustomobject]@{ Count = $secretPairs.Count; ExitCode = $LASTEXITCODE; Output = ($secretOutput -join "`n") }
} else {
  $secretResult = [pscustomobject]@{ Count = 0; ExitCode = 0; Output = '' }
}

$functions = @('edit-thumbnail','generate-thumbnail','recreate-thumbnail')
$deployResults = foreach ($fn in $functions) {
  $output = & $supabaseExe functions deploy $fn --project-ref $projectRef --yes 2>&1
  [pscustomobject]@{ Function = $fn; ExitCode = $LASTEXITCODE; Output = ($output -join "`n") }
}

$smokeRaw = & scripts/remote-smoke.ps1 -AsJson 2>&1
$smokeText = $smokeRaw -join "`n"
$smokeJson = $null
try { $smokeJson = $smokeText | ConvertFrom-Json } catch { }

[pscustomobject]@{
  Secrets = $secretResult
  Deployments = $deployResults
  Smoke = $smokeJson
  SmokeText = $smokeText
} | ConvertTo-Json -Depth 8
