---
title: Aether — Project Summary
date: 2026-06-03
version: 2.0
audience: Engineering Team, Architects, Stakeholders
---

# Aether — Project Summary

## Executive summary

**Aether** is a privacy-oriented dating grid with end-to-end encrypted messaging. The product runs in two modes:

| Mode | When | Experience |
|------|------|------------|
| **Demo** | `VITE_API_URL` unset (e.g. SWA without API var) | Mock profiles, offline auth, local-only data; demo banner shown |
| **Live** | SPA points at Container Apps API + PostgreSQL | Real accounts, profiles, ciphertext storage, SignalR or REST chat |

Repository folder: `optimistic-pasteur`. Product name in UI: **Aether**.

## Architecture overview

```mermaid
flowchart TB
  subgraph client [Browser SPA]
    App[App.jsx]
    APIClient[api/client.js]
    Crypto[crypto.js + IndexedDB keys]
  end
  subgraph azure [Azure optional]
    SWA[Static Web Apps]
    API[Container Apps API]
    PG[(PostgreSQL)]
    SR[SignalR]
  end
  App --> APIClient
  APIClient -->|HTTPS| API
  API --> PG
  API --> SR
  SWA --> App
```

## Key components

| Area | Location | Role |
|------|----------|------|
| SPA | `src/` | Grid, chat, profile, privacy settings |
| API | `api/` | Auth, profiles, E2EE ciphertext, media SAS, moderation |
| Infra | `infra/` | SWA, optional backend platform, Key Vault secrets |
| CI/CD | `.github/workflows/` | `ci.yml`, `deploy-app.yml`, `deploy-api.yml`, `terraform.yml` |

## Security highlights

- Web Crypto E2EE for messages; private keys in **IndexedDB** (`keyStorage.js`)
- Production API rejects dev auth bypass and insecure default secrets
- Rate limiting on auth routes; `/health/ready` checks PostgreSQL
- SWA CSP, Permissions-Policy, and frame-ancestors via `staticwebapp.config.json`

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for demo-only vs full-stack checklists, [BACKEND.md](BACKEND.md) for API routes, and [SECURITY_REVIEW.md](SECURITY_REVIEW.md) for pre-launch review.
