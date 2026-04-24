# Smart Editor Service

Fastify service for Smart Editor detection and replacement.

## Setup

```bash
cd smart-editor-service
npm install
cp .env.example .env
```

### Required env
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `SMART_EDITOR_AI_URL`
- `REDIS_URL`
- `FAL_KEY`

Optional:
- `SMART_EDITOR_CORS_ORIGIN`

## Run

```bash
npm run dev
```

## Frontend env

Set in frontend `.env`:

```
VITE_SMART_EDITOR_API_BASE=http://localhost:8081
```

## Endpoints
- `POST /smart-editor/detect`
- `GET /smart-editor/layers/:imageHash`
- `POST /smart-editor/replace`
- `GET /smart-editor/jobs/:queue/:id`
