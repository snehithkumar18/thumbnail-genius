# Supabase Edge Functions Smoke Plan

## Purpose
Run fast checks across all edge functions to verify:
- Endpoint reachability
- Basic auth behavior
- Validation/error responses
- Deployment consistency

## Prerequisites
- PowerShell
- Network access to Supabase project
- `frontend/.env` containing:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`

Optional:
- Valid user JWT to test authenticated flows

## Run
From repo root:

```powershell
./backend/supabase/scripts/remote-smoke.ps1
```

With user JWT:

```powershell
./backend/supabase/scripts/remote-smoke.ps1 -UserJwt "<user_access_token>"
```

JSON output:

```powershell
./backend/supabase/scripts/remote-smoke.ps1 -AsJson
```

## Testing Mode Toggle (Credits/Plan Bypass)
Use these helpers to quickly allow or block all credit/plan gates during manual testing:

```powershell
./backend/supabase/scripts/testing-mode-on.ps1
./backend/supabase/scripts/testing-mode-off.ps1
```

Or use the single script directly:

```powershell
./backend/supabase/scripts/set-testing-mode.ps1 -Mode on
./backend/supabase/scripts/set-testing-mode.ps1 -Mode off
```

## How to read results
- `200` or `400` with clear validation message: endpoint is reachable and function is deployed.
- `401`: function expects authenticated user context.
- `404` with function not found: function is missing in deployed project.
- `500` config errors (for example `GEMINI_API_KEY not configured`, `supabaseKey is required.`): deployment secrets/env setup issue.

## Current findings from latest run
- Missing from deployed project: `remove-background`, `upscale-image` (404)
- Env misconfiguration in deployed runtime: `edit-thumbnail`, `generate-thumbnail`, `recreate-thumbnail` (`supabaseKey is required.`)
- Missing AI secret in deployed runtime: `get-trends` (`GEMINI_API_KEY not configured`)
- Auth-required flows returning 401 as expected for anonymous checks:
  - `create-checkout-session`
  - `deduct-credits`
  - `face-swap`
  - `score-thumbnail`

## Next fix order
1. Deploy missing functions (`remove-background`, `upscale-image`).
2. Set required Supabase function secrets/env in project runtime (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` or publishable equivalent as needed by each function).
3. Set AI provider secrets (`GEMINI_API_KEY`, and any others used by each function).
4. Re-run smoke checks with anonymous token, then with real user JWT.
5. Execute UI-level end-to-end flows in dashboard pages.
