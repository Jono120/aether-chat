# Operations runbook

Procedures for secret rotation, monitoring alerts, pre-launch checks, and incident response. Complements [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) and [SECURITY_REVIEW.md](SECURITY_REVIEW.md).

---

## Secret rotation

Rotate secrets on a schedule (quarterly minimum for prod) or immediately after suspected compromise.

### JWT signing secret (`JWT_SECRET`)

1. Generate a new 48+ character secret in Key Vault (`jwt-secret-v2` or rotate in place).
2. Update Container App secret reference to the new value.
3. Deploy API revision; all existing session tokens invalidate on next request.
4. Communicate to users: sign in again if sessions drop unexpectedly.
5. Delete old secret version after 24h if using versioned rotation.

**Impact:** All app JWT sessions invalidated. Entra tokens unaffected.

### PostgreSQL administrator password

1. Rotate password in Azure Portal or `az postgres flexible-server update`.
2. Update Key Vault `database-url` secret with new connection string.
3. Restart Container App revision to pick up new reference.
4. Verify `/health/ready` returns `ready`.

**Impact:** Brief API unavailability during restart if password mismatch.

### Azure Storage / SignalR / Service Bus connection strings

1. Regenerate keys in Azure Portal (prefer secondary key swap: enable secondary → update KV → swap primary → disable old).
2. Update corresponding Key Vault secrets.
3. Restart Container App and Function purge worker.
4. Verify media SAS upload and SignalR negotiate succeed.

### SMTP credentials

1. Rotate in email provider; update Container App env or Key Vault.
2. Send test password-reset email in staging.

### Rotation drill checklist

Run in **staging** before each major release:

- [ ] Rotate JWT secret; confirm users must re-login
- [ ] Rotate storage secondary key; confirm album upload works
- [ ] Confirm no secret values appear in Terraform state (`terraform show` grep for connection strings)
- [ ] Confirm GitHub Actions logs contain no secrets

Document drill date and outcome in your change log.

---

## KQL alert templates

Log Analytics workspace: Container App environment (`azurerm_log_analytics_workspace.api`). Adjust table names if using custom diagnostics.

### High 5xx rate (API errors)

```kusto
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(15m)
| where Log_s contains "Request completed"
| extend status = toint(extract(@"status\":(\d+)", 1, Log_s))
| where status >= 500
| summarize errorCount = count() by bin(TimeGenerated, 5m)
| where errorCount > 10
```

**Action:** Check recent deploys, database connectivity, dependency outages. Scale replicas if load-related.

### Auth failure spike (401)

```kusto
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(15m)
| where Log_s contains "Auth verification failed" or Log_s contains '"status":401'
| summarize failures = count() by bin(TimeGenerated, 5m)
| where failures > 50
```

**Action:** Possible credential stuffing or misconfigured client. Review rate-limit 429 rates; consider temporary IP block at WAF.

### Rate limit spike (429)

```kusto
ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(15m)
| where Log_s contains '"status":429'
| summarize throttled = count() by bin(TimeGenerated, 5m)
| where throttled > 100
```

**Action:** Distinguish abuse from legitimate traffic. Tune limits or enable edge rate limiting.

### Create alert rule (Azure Portal)

1. Log Analytics workspace → **Alerts** → **New alert rule**.
2. Paste KQL; set evaluation period 15 minutes; threshold as above.
3. Action group: email/on-call webhook.
4. Severity: 5xx → Sev 1; 401/429 → Sev 2.

---

## Pre-launch verification

Extend [SECURITY_REVIEW.md](SECURITY_REVIEW.md) with environment-specific checks:

| Check | Dev | Staging | Prod |
|-------|-----|---------|------|
| `DEV_AUTH_BYPASS=false` | Optional | Required | Required |
| Panic lock rejects JWT | Manual test | Required | Required |
| Account deletion grace + purge | Manual | Required | Required |
| WAF enabled | No | Optional | Required |
| KV secret refs (no TF plaintext) | N/A | Required | Required |
| KQL alerts configured | No | Basic | Full |

See [SECURITY_REVIEW.md](SECURITY_REVIEW.md) for end-to-end security test scripts.

---

## Incident response outline

### 1. Detect and triage

- Alert fires or user report received.
- Assign incident lead; note time, environment, symptoms.
- Check recent deploys (`deploy-api.yml`, `terraform.yml` runs).

### 2. Contain

| Scenario | Immediate action |
|----------|------------------|
| Stolen JWT / session abuse | Rotate `JWT_SECRET`; lock affected accounts (`users.status = 'locked'`) |
| Database credential leak | Rotate PG password; review firewall / private endpoint access |
| Storage key leak | Regenerate storage keys; review blob access logs |
| DDoS / abuse | Enable or tighten WAF rate rules; confirm Redis rate limits active |
| Compromised admin account | Revoke Entra sessions; set `is_admin = false` in DB; audit admin actions |

### 3. Eradicate and recover

- Deploy patched code or config.
- Verify `/health/ready`, auth flow, and messaging.
- Run rotation drill items for affected secrets.

### 4. Post-incident

- Timeline and root cause (blameless).
- Update [SECURITY_REVIEW.md](SECURITY_REVIEW.md) gaps if new control needed.
- Schedule follow-up tasks (pen test scope, additional alerts).

### Account-level actions (operator)

```sql
-- Panic lock (user-initiated via API; operators can also run)
UPDATE users SET status = 'locked' WHERE entra_oid = '<oid>';

-- Schedule deletion
UPDATE users SET status = 'deletion_pending' WHERE id = '<uuid>';
```

Locked accounts are rejected by `requireAuth` with HTTP 403.

---

## Purge worker health

API sets `WORKER_PURGE_ONLY=true`; message/media TTL purge runs in Azure Functions (`module.function_workers`).

Verify monthly in staging:

1. Confirm Function App is running and connected to Service Bus deletion queue.
2. Schedule test account deletion; confirm purge after grace period.
3. Check Function logs for successful `purgeUserAccount` execution.

---

## Related links

- [DEPLOYMENT.md](DEPLOYMENT.md) — CI/CD and environment tiers
- [BACKEND.md](BACKEND.md) — API routes and workers
- [SECURITY_REVIEW.md](SECURITY_REVIEW.md) — Pre-launch security testing
