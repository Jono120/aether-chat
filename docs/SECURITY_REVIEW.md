# Security review and launch assurance

Use this list before inviting public users or running a formal penetration test. Run staging end-to-end flows in **staging** before promoting to prod.

**Architecture:** See [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) for the layered model and environment tiers. **Operations:** [OPERATIONS.md](OPERATIONS.md).

**Last reviewed:** 2026-06-11 — application source + `infra/` Terraform for Azure deployment.

Legend: **Pass** = implemented in repo or Terraform; **Gap** = action required before production; **Verify** = confirm in your Azure subscription after deploy.

---

## Authentication and session

| Item | Status | Evidence / notes |
|------|--------|------------------|
| `DEV_AUTH_BYPASS=false` and `NODE_ENV=production` on Container Apps | **Pass** | `infra/backend_platform.tf` sets both for API |
| `JWT_SECRET` and `ADMIN_PASSWORD` unique in production | **Pass** | `api/src/config.ts` `validateConfig()`; both random per environment in Key Vault (`infra/backend_secrets.tf`) |
| `X-Dev-User-Id` ineffective in production, never grants admin | **Pass** | Only when `devAuthBypass` true (disabled in TF); admin comes from the DB flag only (`api/src/middleware/auth.ts`) |
| Auth endpoints rate-limited (30 / 15 min per IP) | **Pass** | `api/src/routes/auth.ts` incl. `/oauth/*`, `/oauth/mock`, `/refresh`, `/logout` |
| Locked account rejects existing JWT | **Pass** | `api/src/middleware/auth.ts` returns 403 |
| API security headers (HSTS, CSP, etc.) | **Pass** | `helmet` in `api/src/app.ts` with `default-src 'none'` CSP; SPA ships its own CSP |
| Redis-backed distributed rate limiting | **Pass** | `api/src/middleware/rateLimit.ts`; `validateConfig()` requires `REDIS_URL` in production |
| `CORS_ORIGIN` no wildcards in production | **Pass** | `api/src/config.ts` `validateConfig()` |
| Session JWT expiry matches policy | **Pass** | Access tokens default 1h (`JWT_EXPIRES_IN`); long-lived sessions use rotating refresh tokens with server-side revocation (`POST /auth/refresh`, `POST /auth/logout`) |
| Session JWT algorithm pinned | **Pass** | `verifySessionToken` pins `HS256` (`api/src/services/auth.ts`) |
| Google sign-in verified locally via JWKS | **Pass** | `api/src/services/oauthProviders.ts` — RS256 against Google certs (no `tokeninfo` round-trip) |
| Reset tokens salted per token, delivered via URL fragment | **Pass** | `api/src/services/passwordReset.ts`; token never in query string or API responses |
| Profile lookup enforces discoverable + block checks | **Pass** | `GET /profiles/:id` scoped to viewer (`api/src/services/profiles.ts`) |
| Sign-up writes are transactional | **Pass** | `registerLocalAccount` / `findOrCreateOAuthUser` run all inserts in a single `BEGIN/COMMIT` via the shared `withTransaction` helper (`api/src/db/pool.ts`); no orphaned `users` rows on mid-flow failure |
| Multi-write flows share one transaction pattern | **Pass** | `withTransaction` (`api/src/db/pool.ts`) also wraps refresh rotation, reset/verify token consume, token issue (invalidate + insert), deletion schedule/cancel, panic lock, admin bootstrap, and GDPR purge — partial failure always rolls back |
| User bootstrap consolidated, concurrency-safe | **Pass** | `provisionUser` (`api/src/services/userProvisioning.ts`) upserts with `ON CONFLICT (entra_oid)`; used by local register, OAuth first sign-in, middleware auto-provision (TOCTOU fixed), admin bootstrap, and seed; `isAdmin` can grant but never revoke |
| Opaque tokens share one implementation | **Pass** | `api/src/utils/opaqueToken.ts` — single `<rowId>.<secret>` parse/issue/consume (scrypt-hashed secrets) behind refresh, password-reset, and email-verification tokens; tables remain separate |
| Duplicate-key races handled | **Pass** | PG `23505` on email → friendly 409; on `oauth_identities` → log in to the winning identity (`api/src/services/auth.ts`) |
| Auth routes never leak internal error text | **Pass** | `AuthError` (`api/src/utils/authError.ts`) for intentional messages; everything else logged server-side and replaced with a generic body (`api/src/routes/auth.ts`) |
| Login timing oracle removed | **Pass** | `loginLocalAccount` always runs scrypt — against a dummy hash when the email is unknown (`DUMMY_PASSWORD_HASH` in `api/src/utils/password.ts`) |
| Password length capped (scrypt DoS) | **Pass** | 256-char cap on register/login/reset/change/verify (`MAX_PASSWORD_LENGTH`); request paths use async scrypt so hashing never blocks the event loop |
| `/auth/verify-password` rate-limited | **Pass** | `authRateLimit` applied alongside `requireAuth` (`api/src/routes/auth.ts`) — no password-guessing oracle via a stolen access token |
| Refresh-token reuse detection | **Pass** | Replay of a revoked token with a valid secret revokes the user's entire active token family (`refreshSession` in `api/src/services/auth.ts`); rotation (new insert + old revoke) is atomic |
| Grace-period sign-in | **Pass** | `deletion_pending` accounts may log in (to cancel deletion), aligned with `refreshSession`; locked/purged remain blocked |
| Email verification flow | **Pass** | Migration `014`; hashed 24h tokens via URL fragment; `POST /auth/verify-email` + rate-limited `POST /auth/resend-verification`; OAuth emails count as provider-verified; soft enforcement (client banner) |

---

## API and infrastructure (Azure)

| Item | Status | Evidence / notes |
|------|--------|------------------|
| PostgreSQL TLS (`sslmode=require`) | **Pass** | `infra/backend_secrets.tf` connection string |
| `/health/ready` fails when DB down | **Pass** | `api/src/app.ts` |
| Global 404/500 handlers — no stack in response | **Pass** | `api/src/app.ts` |
| `CORS_ORIGIN` matches SWA hostname only | **Pass** | TF uses `azurerm_static_web_app.app.default_host_name` |
| Secrets in Key Vault, not plain app settings | **Pass** | Staging/prod use managed identity + Key Vault secret refs (`use_key_vault_secret_refs`); dev may use inline secrets |
| Seed never runs in production pipelines | **Pass** | `api/src/db/seed.ts` refuses `NODE_ENV=production`; do not set `ALLOW_SEED` in deploy |
| PostgreSQL public network (prod) | **Pass** | `public_network_access_enabled = false` when network isolation enabled |
| PostgreSQL public network (dev) | **Pass** | Azure-services firewall rule off by default (`postgres_allow_azure_services = false`); set `postgres_allowed_ip_addresses` for team access |
| ACR `admin_enabled` | **Pass** | Disabled; Container App identity has `AcrPull` |
| Private endpoints / VNet integration | **Pass** | `infra/modules/network/` when `enable_network_isolation = true` |
| WAF / Front Door (prod) | **Pass** | `infra/modules/edge/` when `enable_edge_waf = true` |

---

## Client (Static Web Apps)

| Item | Status | Evidence / notes |
|------|--------|------------------|
| `VITE_API_URL` set in deploy workflow | **Verify** | `deploy-app.yml` uses `vars.VITE_API_URL` — must be set in GitHub repo variables |
| No mock profile fallback when API enabled | **Pass** | `App.jsx` — mocks only when `!isApiEnabled()`; API failure returns empty list |
| Device keys in IndexedDB | **Pass** | `src/utils/keyStorage.js` |
| Demo mode banner when API unset | **Pass** | `DemoModeBanner.jsx` |
| CSP and `frame-ancestors` | **Pass** | `public/staticwebapp.config.json` — no `unsafe-inline` scripts; API origins in `connect-src` |
| Browser console avoids PII in production | **Pass** | `src/utils/safeConsole.js`, `ErrorBoundary.jsx` |

---

## Messaging and media

| Item | Status | Evidence / notes |
|------|--------|------------------|
| Ciphertext only on server | **Pass** | E2EE design; envelope fields in `docs/BACKEND.md` |
| SignalR negotiate requires bearer | **Pass** | `api/src/routes/signalr.ts` + `requireAuth` |
| Blob SAS TTL and lifecycle | **Pass** | `infra/modules/data/storage/main.tf` management policy |
| SignalR broadcast auth header | **Pass** | REST call uses short-lived AccessKey-signed JWT (`api/src/signalr/broadcast.ts`); hub name shared with client negotiate (`messages`) |

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
| Secret rotation runbook | **Pass** | [OPERATIONS.md](OPERATIONS.md) |
| KQL alert on error rate | **Pass** | Templates in [OPERATIONS.md](OPERATIONS.md) — configure in Azure Portal |

---

## Compliance

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
| API deploy uses OIDC | **Pass** | `deploy-api.yml` — Azure OIDC aligned with `terraform.yml` |
| API unit tests in CI | **Pass** | `ci.yml` runs `npm test` in `api/` |
| Container image scanning | **Pass** | Trivy in `ci.yml` on API Docker image |
| Dependency audit in CI | **Pass** | `npm audit` in `ci.yml` |
| Terraform plan on infra PRs | **Verify** | `terraform.yml` when present |
| No secrets in workflow logs | **Verify** | Review `docker push` and `az containerapp update` output masking |

---

## Recommended pre-launch actions (priority)

1. Set GitHub `vars.VITE_API_URL` and `vars.VITE_SIGNALR_URL` to production endpoints (Front Door URL when WAF enabled).
2. Run [staging end-to-end security flows](#staging-end-to-end-security-flows) below.
3. Configure KQL alerts from [OPERATIONS.md](OPERATIONS.md).
4. Execute [secret rotation drill](#secret-rotation-drill) in staging.
5. Complete [external penetration test](#external-penetration-test) before public beta.

---

## External penetration test

Before public beta:

- [ ] Engage qualified third-party pen test vendor
- [ ] Scope: SWA SPA, Container Apps API, auth flows, SignalR, blob SAS, admin routes
- [ ] Provide staging URL and test accounts (no production PII)
- [ ] Remediate Critical/High findings before launch
- [ ] Retest fixed issues; archive report for compliance records

Out of scope for MVP (document only): E2EE cryptanalysis, native app reverse engineering (optional add-on).

---

## Staging end-to-end security flows

### Panic lock + JWT rejection

1. Sign in; copy bearer token from devtools / API response.
2. Call `POST /api/v1/account/panic` with token → `200`.
3. Retry any authenticated route with same token → **403** `Account locked`.
4. Sign in again → should fail for local account (status locked).

### Block and report

1. User A blocks User B via `POST /api/v1/users/:id/block`.
2. Confirm User B absent from User A discovery grid.
3. Submit report via `POST /api/v1/users/:id/report`; confirm moderation record created.

### Account deletion

1. Schedule deletion via `POST /api/v1/account/deletion`.
2. Confirm grace period returned in response.
3. Cancel via `DELETE /api/v1/account/deletion` before purge.
4. Re-schedule; wait for worker (or trigger manually in staging) — confirm user data purged.

### GDPR export

1. Authenticated `GET /api/v1/account/export`.
2. Confirm JSON includes profile, preferences, conversations, ciphertext messages.
3. Confirm no other users' data present.

### OAuth rate limiting

1. Send 31+ requests to `/api/v1/auth/oauth/google` within 15 minutes from one IP.
2. Confirm **429** with `Retry-After` header.

---

## Purge worker verification

1. Deploy `module.function_workers` to staging.
2. Confirm Service Bus queue `account-deletion` exists.
3. Schedule test user deletion with short grace (override in staging if supported).
4. Monitor Function App logs for purge completion.
5. Verify PostgreSQL: user status `purged`, related rows removed.

API in-process purge (`WORKER_PURGE_ONLY=false`) is dev-only; prod relies on Function worker.

---

## Secret rotation drill

Execute in staging (see [OPERATIONS.md](OPERATIONS.md)):

- [ ] JWT secret rotated; sessions invalidated
- [ ] Storage key rotated; media upload still works
- [ ] No secrets in `terraform show` output
- [ ] Drill date recorded: _______________

---

## Production gate

Do not open public registration until:

- [ ] Staging E2E flows pass
- [ ] Pen test Critical/High resolved
- [ ] WAF enabled (`enable_edge_waf = true` in prod tfvars)
- [ ] GitHub `production` environment approval on Terraform apply
- [ ] KQL alerts configured with on-call action group
- [ ] This document shows no **Gap** for staging/prod launch items

---

## Related docs

- [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) — layered model and environment tiers
- [OPERATIONS.md](OPERATIONS.md) — rotation, alerts, incident response
- [COMPLIANCE.md](COMPLIANCE.md) — logging policy and user consent
- [BACKEND.md](BACKEND.md) — API and error-report endpoints
- [DEPLOYMENT.md](DEPLOYMENT.md) — SWA + Terraform bootstrap
