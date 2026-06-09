# Aether — documentation index

Maintained documentation for **Aether** (npm package `optimistic-pasteur`). The app runs standalone with mock data or against the optional `api/` service and Azure backend — see [DEPLOYMENT.md](DEPLOYMENT.md).

## Deployment modes

| Mode | When | Experience |
|------|------|------------|
| **Demo** | `VITE_API_URL` unset | Mock profiles, offline auth, local-only data; demo banner shown |
| **Live** | SPA points at Container Apps API + PostgreSQL | Real accounts, profiles, ciphertext storage, SignalR or REST chat |

---

## Getting started

| Document | Who it is for | What it covers |
|----------|---------------|----------------|
| [../README.md](../README.md) | Everyone | Quick start, feature overview, project layout |
| [FEATURES.md](FEATURES.md) | Evaluators, demo presenters | Feature catalogue and 5-minute demo script |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Contributors | Scripts, conventions, extending mocks, verification checklist |

## Application

| Document | Who it is for | What it covers |
|----------|---------------|----------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | Frontend developers | Components, React state, cross-component flows |
| [DESIGN.md](DESIGN.md) | Product / UX | Design criteria, screenshot policy, plan vs built |

## Backend and data

| Document | Who it is for | What it covers |
|----------|---------------|----------------|
| [BACKEND.md](BACKEND.md) | Backend engineers | API services, data stores, E2EE boundaries, schema |
| [DEPLOYMENT.md](DEPLOYMENT.md) | DevOps / maintainers | Azure SWA, Terraform, GitHub Actions, mobile CI |

## Security and compliance

| Document | Who it is for | What it covers |
|----------|---------------|----------------|
| [SECURITY.md](SECURITY.md) | Developers, reviewers | Client crypto, threat model, privacy expectations |
| [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md) | Security / platform | Layered controls, trust boundaries, environment tiers |
| [SECURITY_REVIEW.md](SECURITY_REVIEW.md) | Launch team | Pre-launch checklist, E2E test scripts, production gate |
| [COMPLIANCE.md](COMPLIANCE.md) | Product / legal | Age gate, logging policy, data subject requests |
| [NATIVE_ATTESTATION.md](NATIVE_ATTESTATION.md) | Mobile / API | Play Integrity / App Attest spec for album uploads |

## Operations

| Document | Who it is for | What it covers |
|----------|---------------|----------------|
| [OPERATIONS.md](OPERATIONS.md) | On-call / ops | Secret rotation, KQL alerts, incident response |

---

## Optional assets

- `docs/images/` — screenshots referenced from [FEATURES.md](FEATURES.md) (not required to run the app)

## Out of scope for this doc set

- Signal-style double ratchet / forward secrecy (roadmap)
- npm package publishing or licensing (no licence file in repo yet)
