# Akeyless + Railway Push Sync

Sync static secrets from [Akeyless](https://www.akeyless.io) to [Railway](https://railway.com) service or shared environment variables — the same push pattern used by Doppler and Infisical.

**Repository:** [github.com/akeyless-community/railway-akeyless-sync](https://github.com/akeyless-community/railway-akeyless-sync)

Pair with [@akeyless-community/railway-runtime](https://github.com/akeyless-community/railway-runtime) if you prefer runtime pull instead of push sync.

## Why this integration

Railway injects configuration as environment variables at deploy time. Akeyless stays the source of truth; this tool pushes secrets to Railway via the public GraphQL API (`variableCollectionUpsert`).

**Use cases:**
- Sync API keys and database credentials to a Railway service
- Rotate secrets in Akeyless and propagate via GitHub Actions
- Keep bootstrap-only vars on Railway and push application secrets from Akeyless

## Quick start

### 1. Prerequisites

- [Akeyless](https://console.akeyless.io) static secrets under a folder, e.g. `/railway/my-project/production`
- A Railway **account or workspace** API token ([railway.com/account/tokens](https://railway.com/account/tokens))
- Railway project, environment, and optional service IDs (Cmd/Ctrl+K in dashboard → Copy … ID)

> **Note:** Project-scoped tokens do not work with Railway’s sync API. Use an account or workspace token.

### 2. Install

```bash
npm install -g @akeyless-community/railway-sync
```

Or clone and run locally:

```bash
git clone https://github.com/akeyless-community/railway-akeyless-sync.git
cd railway-akeyless-sync
npm install
cp .env.example .env
# Edit .env
npm run sync
```

### 3. Configure

```bash
export AKEYLESS_ACCESS_ID="p-..."
export AKEYLESS_ACCESS_KEY="..."
export AKEYLESS_SECRET_PATH="/railway/my-project/production"
export RAILWAY_API_TOKEN="..."
export RAILWAY_PROJECT_ID="..."
export RAILWAY_ENVIRONMENT_ID="..."
export RAILWAY_SERVICE_ID="..."   # optional — omit for shared variables
```

### 4. Sync

```bash
# Preview
akeyless-railway-sync sync --dry-run

# Apply
akeyless-railway-sync sync
```

## GitHub Action

Add [`.github/workflows/sync-secrets.yml`](./examples/github-workflow/sync-secrets.yml):

```yaml
name: Sync secrets to Railway

on:
  schedule:
    - cron: "0 */6 * * *"
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: akeyless-community/railway-akeyless-sync/action@v1
        with:
          akeyless-access-id: ${{ secrets.AKEYLESS_ACCESS_ID }}
          akeyless-access-key: ${{ secrets.AKEYLESS_ACCESS_KEY }}
          akeyless-secret-path: /railway/my-project/production
          railway-api-token: ${{ secrets.RAILWAY_API_TOKEN }}
          railway-project-id: ${{ secrets.RAILWAY_PROJECT_ID }}
          railway-environment-id: ${{ secrets.RAILWAY_ENVIRONMENT_ID }}
          railway-service-id: ${{ secrets.RAILWAY_SERVICE_ID }}
```

### GitHub secrets to configure

| Secret | Description |
|--------|-------------|
| `AKEYLESS_ACCESS_ID` | Akeyless access ID (read-only on sync path) |
| `AKEYLESS_ACCESS_KEY` | Akeyless access key |
| `RAILWAY_API_TOKEN` | Railway account/workspace token |
| `RAILWAY_PROJECT_ID` | Target project ID |
| `RAILWAY_ENVIRONMENT_ID` | Target environment ID |
| `RAILWAY_SERVICE_ID` | Optional service ID |

## Secret naming

| Akeyless path | Railway variable |
|---------------|------------------|
| `/railway/my-project/production/database-url` | `DATABASE_URL` |
| `/railway/my-project/production/stripe-secret-key` | `STRIPE_SECRET_KEY` |

Rules:
- Folder path is stripped; only the item name is used
- Non-alphanumeric characters become underscores
- Names are uppercased
- `RAILWAY_*` variables are never overwritten (Railway-provided)
- Reference variables (`${{ Service.VAR }}`) are skipped by default

## Configuration reference

| Variable | Default | Description |
|----------|---------|-------------|
| `DELETE_ORPHANED` | `false` | Remove Railway vars not in Akeyless |
| `SKIP_DEPLOYS` | `false` | Pass `skipDeploys` to Railway API |
| `REPLACE_ALL` | `false` | Replace entire variable set (dangerous) |
| `SKIP_RAILWAY_PREFIX` | `true` | Never sync `RAILWAY_*` names |
| `SKIP_REFERENCE_VARIABLES` | `true` | Skip existing `${{ … }}` references |

## Push sync vs runtime pull

| Pattern | Tool |
|---------|------|
| **Push sync** (this repo) | Secrets copied into Railway variables |
| **Runtime pull** | [`@akeyless-community/railway-runtime`](https://github.com/akeyless-community/railway-runtime) — app fetches at startup |

## Related projects

- [railway-runtime](https://github.com/akeyless-community/railway-runtime) — fetch secrets at runtime on Railway
- [supabase-akeyless-integration](https://github.com/akeyless-community/supabase-akeyless-integration) — same push-sync pattern for Supabase

## License

Apache-2.0
