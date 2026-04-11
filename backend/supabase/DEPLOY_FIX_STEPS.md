# Deploy Fix Steps (Remote)

## Why this exists
Current remote smoke checks show:
- `remove-background` and `upscale-image` are not deployed (404)
- Some functions fail due missing runtime secrets (`FAL_KEY not configured`, `TOGETHER_API_KEY not configured`, `supabaseKey is required.`)

## Prerequisites
- Supabase personal access token
- Project secrets:
  - Service role key
  - Anon key
  - Gemini API key
  - Groq API key
  - FAL key
  - Together API key

## One-command remediation
From repo root:

```powershell
./backend/supabase/scripts/remote-remediate.ps1 `
  -SupabaseAccessToken "<SUPABASE_ACCESS_TOKEN>" `
  -GeminiApiKey "<GEMINI_API_KEY>" `
  -GroqApiKey "<GROQ_API_KEY>" `
  -FalKey "<FAL_KEY>" `
  -TogetherApiKey "<TOGETHER_API_KEY>"
```

## What the script does
1. Deploys image functions that use FAL/Together:
  - `generate-thumbnail`
  - `recreate-thumbnail`
  - `edit-thumbnail`
  - `face-swap`
  - `remove-background`
  - `upscale-image`
2. Sets required secrets for remote runtime:
   - `GEMINI_API_KEY`
  - `GROQ_API_KEY`
  - `FAL_KEY`
  - `TOGETHER_API_KEY`
3. Runs remote smoke checks after deployment.

## Manual fallback commands
If you prefer manual execution:

```powershell
$env:SUPABASE_ACCESS_TOKEN="<SUPABASE_ACCESS_TOKEN>"
$supabase="C:/Users/NEHITH/.supabase/bin/supabase.exe"

& $supabase functions deploy remove-background --project-ref jmdvwkolahvabnisawev
& $supabase functions deploy upscale-image --project-ref jmdvwkolahvabnisawev

& $supabase secrets set SUPABASE_URL="https://jmdvwkolahvabnisawev.supabase.co" --project-ref jmdvwkolahvabnisawev
& $supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<SUPABASE_SERVICE_ROLE_KEY>" --project-ref jmdvwkolahvabnisawev
& $supabase secrets set SUPABASE_ANON_KEY="<SUPABASE_ANON_KEY>" --project-ref jmdvwkolahvabnisawev
& $supabase secrets set GEMINI_API_KEY="<GEMINI_API_KEY>" --project-ref jmdvwkolahvabnisawev

./backend/supabase/scripts/remote-smoke.ps1
```
