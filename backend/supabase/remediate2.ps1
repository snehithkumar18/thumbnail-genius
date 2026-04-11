$ErrorActionPreference = 'Stop'
$projectRef = 'jmdvwkolahvabnisawev'
$supabaseExe = 'C:\Users\NEHITH\.supabase\bin\supabase.exe'
$backendEnv = '.env.local'
$frontendEnv = '..\..\frontend\.env'

function Invoke-Supabase([string[]]$Args) {
  $outFile = [System.IO.Path]::GetTempFileName()
  $errFile = [System.IO.Path]::GetTempFileName()
  try {
    $proc = Start-Process -FilePath $supabaseExe -ArgumentList $Args -NoNewWindow -Wait -PassThru -RedirectStandardOutput $outFile -RedirectStandardError $errFile
    [pscustomobject]@{
      ExitCode = $proc.ExitCode
      StdOut = (Get-Content $outFile -Raw)
      StdErr = (Get-Content $errFile -Raw)
    }
  } finally {
    Remove-Item $outFile,$errFile -ErrorAction SilentlyContinue
  }
}

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

$secretResult = if ($secretPairs.Count -gt 0) {
  Invoke-Supabase (@('secrets','set') + $secretPairs.ToArray() + @('--project-ref',$projectRef,'--yes'))
} else {
  [pscustomobject]@{ ExitCode = 0; StdOut = ''; StdErr = '' }
}

$deployResults = foreach ($fn in @('edit-thumbnail','generate-thumbnail','recreate-thumbnail')) {
  $r = Invoke-Supabase @('functions','deploy',$fn,'--project-ref',$projectRef,'--yes')
  [pscustomobject]@{ Function = $fn; ExitCode = $r.ExitCode; StdOut = $r.StdOut; StdErr = $r.StdErr }
}

$smoke = & scripts/remote-smoke.ps1 -AsJson 2>&1
$smokeText = $smoke -join "`n"
$smokeJson = $null
try { $smokeJson = $smokeText | ConvertFrom-Json } catch { }

[pscustomobject]@{
  Secrets = [pscustomobject]@{ Count = $secretPairs.Count; ExitCode = $secretResult.ExitCode; StdErr = $secretResult.StdErr; StdOut = $secretResult.StdOut }
  Deployments = $deployResults
  Smoke = $smokeJson
  SmokeText = $smokeText
} | ConvertTo-Json -Depth 8
