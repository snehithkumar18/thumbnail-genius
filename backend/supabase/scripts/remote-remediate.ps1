param(
  [Parameter(Mandatory = $true)]
  [string]$SupabaseAccessToken,

  [string]$SupabaseUrl = "https://jmdvwkolahvabnisawev.supabase.co",
  [string]$SupabaseServiceRoleKey,
  [string]$SupabaseAnonKey,
  [string]$GeminiApiKey,
  [string]$GroqApiKey,
  [string]$FalKey,
  [string]$TogetherApiKey,
  [string]$DodoSecretKey,
  [string]$DodoWebhookSecret,

  [string]$ProjectRef = "jmdvwkolahvabnisawev"
)

$ErrorActionPreference = "Stop"
$env:SUPABASE_ACCESS_TOKEN = $SupabaseAccessToken
$supabase = "C:\Users\NEHITH\.supabase\bin\supabase.exe"

if (-not (Test-Path $supabase)) {
  throw "Supabase CLI not found at $supabase"
}

Write-Host "Using project: $ProjectRef"
Write-Host "Supabase CLI: $(& $supabase --version)"

Push-Location (Resolve-Path (Join-Path $PSScriptRoot ".."))
try {
  $functionsToDeploy = @(
    "generate-thumbnail",
    "recreate-thumbnail",
    "edit-thumbnail",
    "face-swap",
    "remove-background",
    "upscale-image"
  )

  Write-Host "Deploying image generation/edit functions..."
  foreach ($fn in $functionsToDeploy) {
    & $supabase functions deploy $fn --project-ref $ProjectRef
  }

  Write-Host "Setting required secrets..."
  if ($SupabaseUrl) {
    & $supabase secrets set SUPABASE_URL=$SupabaseUrl --project-ref $ProjectRef
  }
  if ($SupabaseServiceRoleKey) {
    & $supabase secrets set SUPABASE_SERVICE_ROLE_KEY=$SupabaseServiceRoleKey --project-ref $ProjectRef
  }
  if ($SupabaseAnonKey) {
    & $supabase secrets set SUPABASE_ANON_KEY=$SupabaseAnonKey --project-ref $ProjectRef
    & $supabase secrets set SUPABASE_PUBLISHABLE_KEY=$SupabaseAnonKey --project-ref $ProjectRef
  }
  if ($GeminiApiKey) {
    & $supabase secrets set GEMINI_API_KEY=$GeminiApiKey --project-ref $ProjectRef
  }
  if ($GroqApiKey) {
    & $supabase secrets set GROQ_API_KEY=$GroqApiKey --project-ref $ProjectRef
  }
  if ($FalKey) {
    & $supabase secrets set FAL_KEY=$FalKey --project-ref $ProjectRef
  }
  if ($TogetherApiKey) {
    & $supabase secrets set TOGETHER_API_KEY=$TogetherApiKey --project-ref $ProjectRef
  }
  if ($DodoSecretKey) {
    & $supabase secrets set DODO_SECRET_KEY=$DodoSecretKey --project-ref $ProjectRef
  }
  if ($DodoWebhookSecret) {
    & $supabase secrets set DODO_WEBHOOK_SECRET=$DodoWebhookSecret --project-ref $ProjectRef
  }

  Write-Host "Listing secrets to verify key presence..."
  & $supabase secrets list --project-ref $ProjectRef
}
finally {
  Pop-Location
}

Write-Host "Running remote smoke checks..."
Push-Location (Resolve-Path (Join-Path $PSScriptRoot "..\..\.."))
try {
  .\backend\supabase\scripts\remote-smoke.ps1
}
finally {
  Pop-Location
}

Write-Host "Remediation flow completed."
