# Aether — documentation index

Maintained documentation for the **Aether** client-only prototype (`optimistic-pasteur` npm package). Application code is client-only; hosting on Azure is optional — see [DEPLOYMENT.md](DEPLOYMENT.md).

## Start here

| Document | Who it is for | What it covers |
|----------|---------------|----------------|
| [../README.md](../README.md) | Everyone | Quick start, feature overview, project layout, tech stack |
| [project-summary.md](project-summary.md) | Engineers, architects, stakeholders | Executive summary, architecture diagrams, code map |
| [FEATURES.md](FEATURES.md) | Evaluators, demo presenters | Feature catalogue and 5-minute demo script |
| [SECURITY.md](SECURITY.md) | Security reviewers | Prototype limits, simulated vs real behaviour, threat model |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Developers | Components, React state, cross-component flows |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Contributors | Scripts, conventions, extending mocks, verification checklist |
| [DEPLOYMENT.md](DEPLOYMENT.md) | DevOps / maintainers | Azure Static Web Apps, Terraform, GitHub Actions |
| [BACKEND.md](BACKEND.md) | Backend engineers | API services, data stores, E2EE boundaries |
| [DATA_MODEL.md](DATA_MODEL.md) | Backend / data | ER diagram, tables, TTL and store rules |
| [DESIGN.md](DESIGN.md) | Product / UX | Design criteria, screenshot policy, plan vs built |

## Optional assets

- `docs/images/` — screenshots referenced from [FEATURES.md](FEATURES.md) (not required to run the app)

## Out of scope for this doc set

- Signal-style double ratchet / forward secrecy (roadmap)
- npm package publishing or licensing (no licence file in repo yet)
- Web Crypto E2EE and server ciphertext rules are in [SECURITY.md](SECURITY.md)
- Azure hosting: [DEPLOYMENT.md](DEPLOYMENT.md); backend modules: [BACKEND.md](BACKEND.md)
