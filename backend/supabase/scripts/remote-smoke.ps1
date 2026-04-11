param(
  [string]$EnvFile = "frontend/.env",
  [string]$UserJwt = "",
  [switch]$AsJson
)

$ErrorActionPreference = "Stop"

function Get-EnvValue {
  param(
    [string]$FilePath,
    [string]$Name
  )

  $line = Get-Content $FilePath | Where-Object { $_ -match "^$Name=" } | Select-Object -First 1
  if (-not $line) { return $null }

  $value = $line.Substring($Name.Length + 1).Trim()
  if ($value.StartsWith('"') -and $value.EndsWith('"')) {
    $value = $value.Substring(1, $value.Length - 2)
  }
  return $value
}

function Clip {
  param(
    [string]$Text,
    [int]$Length = 200
  )

  if ([string]::IsNullOrEmpty($Text)) { return "" }
  if ($Text.Length -le $Length) { return $Text }
  return $Text.Substring(0, $Length)
}

if (-not (Test-Path $EnvFile)) {
  throw "Env file not found: $EnvFile"
}

$functions = @(
  "create-checkout-session",
  "deduct-credits",
  "dodo-webhook",
  "edit-thumbnail",
  "face-swap",
  "generate-thumbnail",
  "generate-titles",
  "get-trends",
  "recreate-thumbnail",
  "remove-background",
  "score-thumbnail",
  "upscale-image"
)

$supabaseUrl = Get-EnvValue -FilePath $EnvFile -Name "VITE_SUPABASE_URL"
$publishableKey = Get-EnvValue -FilePath $EnvFile -Name "VITE_SUPABASE_PUBLISHABLE_KEY"

if (-not $supabaseUrl) {
  throw "VITE_SUPABASE_URL missing in $EnvFile"
}
if (-not $publishableKey) {
  throw "VITE_SUPABASE_PUBLISHABLE_KEY missing in $EnvFile"
}

$authToken = if ($UserJwt) { $UserJwt } else { $publishableKey }

$results = @()

foreach ($name in $functions) {
  $url = "$supabaseUrl/functions/v1/$name"
  $headers = @{
    "apikey" = $publishableKey
    "Authorization" = "Bearer $authToken"
    "Content-Type" = "application/json"
  }

  $status = 0
  $snippet = ""

  try {
    $response = Invoke-WebRequest -Method Post -Uri $url -Headers $headers -Body "{}" -TimeoutSec 30
    $status = [int]$response.StatusCode
    $snippet = Clip -Text $response.Content
  }
  catch {
    $ex = $_.Exception
    if ($ex.Response) {
      $status = [int]$ex.Response.StatusCode
      $reader = New-Object System.IO.StreamReader($ex.Response.GetResponseStream())
      $body = $reader.ReadToEnd()
      $reader.Close()
      $snippet = Clip -Text $body
    }
    else {
      $status = -1
      $snippet = Clip -Text $ex.Message
    }
  }

  $results += [PSCustomObject]@{
    Function = $name
    StatusCode = $status
    Snippet = $snippet
  }
}

if ($AsJson) {
  $results | ConvertTo-Json -Depth 3
}
else {
  $results | Format-Table -AutoSize
}
