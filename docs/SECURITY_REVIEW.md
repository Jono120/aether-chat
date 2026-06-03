# Security review checklist (pre-launch)

Use this list before inviting public users or running a formal penetration test.

**Last reviewed:** 2026-06-03 — application source + `infra/` Terraform for Azure deployment.

Legend: **Pass** = implemented in repo or Terraform; **Gap** = action required before production; **Verify** = confirm in your Azure subscription after deploy.

---

## Authentication and session

| Item | Status | Evidence / notes |
|------|--------|------------------|
| `DEV_AUTH_BYPASS=false` and `NODE_ENV=production` on Container Apps | **Pass** | `infra/backend_platform.tf` sets both for API |
| `JWT_SECRET` and `ADMIN_PASSWORD` unique in production | **Pass** | `api/src/config.ts` `validateConfig()`; random JWT in Key Vault |
| `X-Dev-User-Id` ineffective in production | **Pass** | Only when `devAuthBypass` true (disabled in TF) |
| Auth endpoints rate-limited (30 / 15 min per IP) | **Pass** | `api/src/routes/auth.ts` |
| Session JWT expiry matches policy | **Verify** | Set `JWT_EXPIRES_IN` in Container App env / Key Vault |

---

## API and infrastructure (Azure)

| Item | Status | Evidence / notes |
|------|--------|------------------|
| PostgreSQL TLS (`sslmode=require`) | **Pass** | `infra/backend_secrets.tf` connection string |
| `/health/ready` fails when DB down | **Pass** | `api/src/app.ts` |
| Global 404/500 handlers — no stack in response | **Pass** | `api/src/app.ts` |
| `CORS_ORIGIN` matches SWA hostname only | **Pass** | TF uses `azurerm_static_web_app.app.default_host_name` |
| Secrets in Key Vault, not plain app settings | **Gap** | Secrets stored in KV but Container App `secret` blocks use Terraform `value = secret.value` — state may contain secret material. **Remediation:** managed identity + Key Vault secret references, or inject via `az containerapp secret set` outside TF state. |
| Seed never runs in production pipelines | **Pass** | `api/src/db/seed.ts` refuses `NODE_ENV=production`; do not set `ALLOW_SEED` in deploy |
| PostgreSQL public network (prod) | **Pass** | `public_network_access_enabled = false` when `environment == "prod"` |
| PostgreSQL public network (dev) | **Gap** | Dev tfvars allow public PG — restrict firewall / use private endpoint before real user data |
| ACR `admin_enabled` | **Gap** | `infra/backend_secrets.tf` — prefer managed identity + `AcrPull`, disable admin user |
| Private endpoints / VNet integration | **Gap** | Not in current modules — add for high-assurance prod |
| Container App ingress HTTPS only | **Verify** | Azure default for external ingress; confirm custom domain + TLS binding |

---

## Client (Static Web Apps)

| Item | Status | Evidence / notes |
|------|--------|------------------|
| `VITE_API_URL` set in deploy workflow | **Verify** | `deploy-app.yml` uses `vars.VITE_API_URL` — must be set in GitHub repo variables |
| No mock profile fallback when API enabled | **Pass** | `App.jsx` — mocks only when `!isApiEnabled()`; API failure returns empty list |
| Device keys in IndexedDB | **Pass** | `src/utils/keyStorage.js` |
| Demo mode banner when API unset | **Pass** | `DemoModeBanner.jsx` |
| CSP and `frame-ancestors` | **Pass** | `public/staticwebapp.config.json` |
| Browser console avoids PII in production | **Pass** | `src/utils/safeConsole.js`, `ErrorBoundary.jsx` |

---

## Messaging and media

| Item | Status | Evidence / notes |
|------|--------|------------------|
| Ciphertext only on server | **Pass** | E2EE design; envelope fields in `docs/BACKEND.md` |
| SignalR negotiate requires bearer | **Pass** | `api/src/routes/signalr.ts` + `requireAuth` |
| Blob SAS TTL and lifecycle | **Pass** | `infra/modules/data/storage/main.tf` management policy |
| SignalR broadcast auth header | **Verify** | REST call uses connection string; confirm Azure SignalR REST auth pattern for your SKU |

---

## Operations and logging

| Item | Status | Evidence / notes |
|------|--------|------------------|
| `WORKER_PURGE_ONLY=true` on API | **Pass** | `infra/backend_platform.tf` |
| Purge worker deployed separately | **Verify** | `module.function_workers` + `api/workers/purge/` — confirm Function App wired to Service Bus in your env |
| Structured JSON logs → Log Analytics | **Pass** | Container App env + LA workspace 30-day retention |
| Logs omit PII (no user consent required) | **Pass** | `api/src/utils/logSanitize.ts` + centralized `logger.ts` |
| `POST /support/error-reports` rate-limited | **Pass** | 10/user/hr, 30/IP/hr — `api/src/routes/support.ts` |
| Support/admin 500 bodies generic | **Pass** | Routes return `{ error: message }` without stacks |
| Secret rotation runbook | **Gap** | Document rotation for JWT, DB password, SignalR/Storage keys |
| KQL alert on error rate | **Gap** | Optional: alert rule on 5xx `Request completed` logs |

---

## Compliance (dating app)

| Item | Status | Evidence / notes |
|------|--------|------------------|
| Age gate (18+) before first use | **Pass** | `AgeGate.jsx`, `App.jsx` gating; policies readable before confirm |
| Terms and Privacy linked from auth | **Pass** | `AuthPage.jsx` (signup consent + footer), overlay `LegalPage.jsx`, `src/content/legal.js` |
| Policies available when signed in | **Pass** | Settings → Legal; `#terms` / `#privacy` hash overlay |
| Block and report against live API | **Verify** | End-to-end test in staging with `VITE_API_URL` |
| Account deletion grace documented | **Pass** | `docs/COMPLIANCE.md`, Privacy Center + API |
| Error report opt-in for auto crashes | **Pass** | Default off; `clientErrorReporting.js` |

---

## CI/CD (GitHub Actions)

| Item | Status | Evidence / notes |
|------|--------|------------------|
| API deploy uses OIDC / service principal | **Verify** | `deploy-api.yml` — `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` secrets |
| Terraform plan on infra PRs | **Verify** | `terraform.yml` when present |
| No secrets in workflow logs | **Verify** | Review `docker push` and `az containerapp update` output masking |

---

## Recommended pre-launch actions (priority)

1. Set GitHub `vars.VITE_API_URL` and `vars.VITE_SIGNALR_URL` to production endpoints.
2. Replace Terraform-inlined Container App secret values with Key Vault references or post-apply secret injection.
3. Disable ACR admin user; use workload identity for pull.
4. Run block/report/deletion/panic flows against staging API.
5. Execute secret rotation drill (JWT + PostgreSQL).
6. Confirm Function purge worker processes `account-deletion` queue in production.

---

## Related docs

- [COMPLIANCE.md](COMPLIANCE.md) — logging policy and user consent
- [BACKEND.md](BACKEND.md) — API and error-report endpoints
- [DEPLOYMENT.md](DEPLOYMENT.md) — SWA + Terraform bootstrap
