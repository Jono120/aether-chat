# Compliance notes (MVP beta)

This document tracks privacy and safety controls implemented in Aether. It is not legal advice.

## Age and consent

- Users must confirm they are **18+** via the in-app age gate (`AgeGate.jsx`) before access, with links to legal policies on the same screen.
- **Terms of Service** and **Privacy Policy** full text lives in `src/content/legal.js` and is shown in a modal overlay (`LegalPage.jsx`) from:
  - Age gate (`LegalLinks`)
  - Sign-up (required checkbox) and sign-in footer (`AuthPage.jsx`)
  - Settings → Legal (`PrivacyCenter.jsx`)
  - Hash routes `#terms` and `#privacy` (overlay; underlying screen state is preserved)
- OAuth sign-in displays an “by continuing you agree” notice with links to the same policies.

## User permission and personal data

| Activity | User permission required | What is collected |
|----------|-------------------------|-------------------|
| Manual error report | Explicit submit in Privacy Center | User-authored description; optional allowlisted device context |
| Automatic crash report | Opt-in toggle (default **off**) + signed in | Error name, truncated message/stack; allowlisted context only |
| Operational API logs | None (not user-facing telemetry) | **No PII** — see [Logging policy](#logging-policy) |
| Support alert email | N/A (operator inbox) | Report id, source, masked user email, truncated description preview — only when SMTP configured |
| Password reset email | User requests reset | Email address via SMTP |
| Email verification email | User signs up with email/password (or requests a resend) | Email address via SMTP |

Users are not profiled from operational logs. Identifiers in Log Analytics are limited to opaque `requestId`, HTTP method, sanitized route templates, and status codes.

## Logging policy

**Principle:** Operational logs must not contain personal information unless the user has explicitly opted in to a separate product feature (error reports), and even then report **content** is stored in PostgreSQL — not duplicated into stdout / Log Analytics.

### API (Container Apps → Log Analytics)

All structured logs pass through `api/src/utils/logSanitize.ts` before emission:

- **Redacted keys:** `userId`, `email`, `to`, `password`, `token`, `session`, `cipher`, `message`, `description`, `stack`, etc.
- **String scrubbing:** emails, UUIDs, IPv4 addresses, and Bearer tokens replaced with `[redacted-*]` placeholders.
- **Request logs:** query strings stripped; path segments that look like UUIDs replaced with `:id`; field named `route` (not raw URL).
- **Error reports:** logs include `reportId` and `source` only — not `userId` or description body.
- **Auth failures:** error **name** only, never token or stack in logs.

Retention: Log Analytics workspace **30 days** (`infra/modules/compute/container_app_api/main.tf`).

### Browser

- Production builds use `safeConsole.js` for error boundaries (name + redacted message only; no component stack in prod console).
- Optional auto crash reports require the Privacy Center toggle `aether_auto_error_report`.

## User data

| Data | Storage | Notes |
|------|---------|-------|
| Profile metadata | PostgreSQL | Display name, bio, fuzzed distance labels |
| Message ciphertext | PostgreSQL | Server cannot read plaintext without device keys |
| Device public keys | PostgreSQL | Required for E2EE |
| Private keys | IndexedDB (browser) | Never sent to server |
| Error reports | PostgreSQL when online; local queue offline | Manual form or opt-in auto; context allowlisted + redacted server-side |
| Auto crash reports | Same table, `source=auto` | Error name + truncated stack only; no message plaintext |
| Ops logs | Log Analytics | Sanitized JSON; no personal data |

## Safety tools

- **Block** — removes peer from discovery (`POST /api/v1/users/:id/block`)
- **Report** — queues moderation record (`POST /api/v1/users/:id/report`)
- **Panic** — revokes keys and enables stealth locally + server sync when online

## Data subject requests

- Account deletion can be scheduled from Privacy Center (grace period in `localStorage` + API). Users can still **sign in during the grace period** (`deletion_pending` status) so they can cancel the deletion; locked and purged accounts cannot.
- **GDPR erasure (Art. 17):** when the purge runs (`purgeUserAccount` in `api/src/services/account.ts`), the following are **deleted**: local account credentials (email + password hash), OAuth identities, password reset tokens, email verification tokens, refresh tokens, device keys, profile, preferences, media metadata, blocks, read receipts, error reports, conversation memberships, and **all messages in every conversation the user participated in** (not just messages they sent). The `users` row is scrubbed in place (`entra_oid` replaced with an opaque `purged:<id>` value, `is_admin` cleared, `status = 'purged'`, `purged_at` recorded) and is retained only as an anonymized audit anchor for `deletion_requests`.
- **GDPR export:** `GET /api/v1/account/export` returns server-held personal data (profile, preferences, ciphertext messages, media metadata). Message plaintext requires device keys or [chat backup export](../src/components/ChatBackupPanel.jsx) for decrypted history.

## Error reporting

- **Manual reports** — user-authored description; optional device context (allowlisted fields).
- **Automatic reports** — disabled by default (`aether_auto_error_report` in browser storage). When enabled, only sent if the user is signed in and the API is reachable.
- **Redaction** — query strings, tokens, passwords, session identifiers, and chat-related keys are stripped before storage. Free-text manual descriptions are not scanned for PII.
- **Retention** — reports remain in PostgreSQL until deleted by operators or until the submitting user's account is purged (reports are deleted as part of account erasure); operational logs follow Log Analytics workspace retention and exclude report bodies.

## Email

Password reset emails are sent via SMTP when `SMTP_*` variables are configured. Reset tokens are never returned in API responses; in dev mode without SMTP the token is printed to the server console only. Reset links carry the token in the URL **fragment** (`#reset=...`) so it is not sent to servers or recorded in logs/Referer headers.

Email verification works the same way: signing up with email/password sends a verification email (24-hour token, stored only as a salted hash) with the token in the URL fragment (`#verify-email=...`). Verification is **soft-enforced** — unverified accounts see an in-app banner with a rate-limited resend option, but are not blocked. Accounts created via Google/Apple are treated as verified by the provider.

New error reports can trigger an alert to `SUPPORT_ALERT_EMAIL` (or `ADMIN_EMAIL`) when SMTP is configured. Alert bodies are for operator triage only and are not written to application logs; the user email is masked (`j***@example.com`) and the description preview truncated to 120 characters — full content stays in PostgreSQL behind the admin API.

## Azure deployment (summary)

See [SECURITY_REVIEW.md](SECURITY_REVIEW.md) for infrastructure checklist. Production Terraform sets `DEV_AUTH_BYPASS=false`, `WORKER_PURGE_ONLY=true`, TLS PostgreSQL (`sslmode=require`), CORS to the Static Web App hostname, and secrets in Key Vault referenced by Container Apps.
