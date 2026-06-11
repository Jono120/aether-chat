# Aether — Chat Grid

**Aether** is a React app prototype: a discovery grid, Web Crypto end-to-end encrypted chat, and a privacy centre for keys, EXIF tooling, and safety controls. It runs **standalone** with mock data, or **live** against the optional [`api/`](api/) service and Azure backend.

> **Disclaimer** — A demo, not production-hardened. Real X25519/AES-GCM runs on the client; the server stores **ciphertext and public keys only**. No raw GPS. See [docs/SECURITY.md](docs/SECURITY.md).

Clone path / npm package: `optimistic-pasteur`.

---

## Run modes

| Mode | When | Experience |
|------|------|------------|
| **Demo** | `VITE_API_URL` unset | Mock profiles, offline auth, local-only data; demo banner shown |
| **Live** | SPA points at the Container Apps API + PostgreSQL | Real accounts, profiles, ciphertext storage, SignalR/REST chat |

---

## Features

- **Discovery Grid** — fuzzed distance bands, generative avatars, stealth mode, block & report, filters. ([`src/components/Grid.jsx`](src/components/Grid.jsx))
- **Encrypted Chats** — 1:1 and group threads, wire inspector, self-destruct timers, ephemeral secure album with blur shield, EXIF inspect/strip on JPEGs. ([`src/components/ChatRoom.jsx`](src/components/ChatRoom.jsx))
- **Privacy Centre** — key ring + rotation, location fuzzing, screenshot shield (native), accessibility settings, panic wipe, 30-day account-deletion grace, GDPR export. ([`src/components/PrivacyCenter.jsx`](src/components/PrivacyCenter.jsx))
- **Accounts** (live) — local sign-up/login + Google OAuth, email verification, password reset, rotating session refresh tokens, 18+ age gate, Terms/Privacy pages.
- **Internationalised** — `en-NZ` (default), `es`, `fr` with automatic locale detection.
- **Native app** — Capacitor wrapper in [`mobile/`](mobile/) for iOS/Android; web browsers stay album-blocked.

---

## Quick start

Requires **Node.js 18+**. From the repo root:

```bash
npm start
```

`npm start` runs [`scripts/start-dev.mjs`](scripts/start-dev.mjs): installs dependencies if needed, starts Vite, and opens the browser.

```bash
npm run dev        # Vite dev server (no auto-open)
npm run build      # production build → dist/
npm run preview    # serve the production build
npm run lint       # ESLint
```

To run live, set `VITE_API_URL` (and `VITE_SIGNALR_URL`) and start the API — see [docs/BACKEND.md](docs/BACKEND.md) and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## Demo walkthrough

1. Confirm the **age gate**, then sign in (demo mode accepts any credentials).
2. Open **Grid** → select a profile → **Message**.
3. Send a message → open the **Wire Inspector** to view the ciphertext envelope.
4. Try a self-destruct timer or strip metadata from a JPEG in the EXIF panel.
5. Open **Settings** (Privacy Centre) → inspect the key ring → **Rotate Keys**.
6. Trigger **Panic** to wipe local keys and return to the grid.

Full script: [docs/FEATURES.md](docs/FEATURES.md).

---

## Project structure

```text
api/                     # TypeScript REST API: auth, profiles, chat, media, admin (optional)
infra/                   # Terraform — SWA + Azure backend modules
mobile/                  # Capacitor iOS/Android shell
src/
├── App.jsx              # Tabs, auth/session, keys, profiles, panic wipe
├── api/client.js        # Backend client when VITE_API_URL is set
├── components/          # Grid, ChatRoom, PrivacyCenter, AuthPage, …
├── i18n/                # Locales (en-NZ, es, fr) + detection
└── utils/crypto.js      # Web Crypto E2EE
docs/                    # Backend, security, architecture, ops, compliance
scripts/start-dev.mjs    # npm start launcher
```

---

## Tech stack

React 19 · Vite 8 · i18next · @microsoft/signalr · lucide-react · Capacitor (mobile). The SPA has no server runtime dependency; the optional API is Node/Express + PostgreSQL on Azure.

---

## Documentation

Full index: [docs/README.md](docs/README.md).

| Document | Description |
|----------|-------------|
| [BACKEND.md](docs/BACKEND.md) | API services, data stores, schema, E2EE boundaries |
| [SECURITY.md](docs/SECURITY.md) | Client crypto, threat model, privacy expectations |
| [SECURITY_ARCHITECTURE.md](docs/SECURITY_ARCHITECTURE.md) | Layered controls, trust boundaries, environment tiers |
| [SECURITY_REVIEW.md](docs/SECURITY_REVIEW.md) | Pre-launch checklist, E2E test scripts, production gate |
| [COMPLIANCE.md](docs/COMPLIANCE.md) | Age gate, logging policy, data subject requests |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Components, state, flows, crypto path |
| [FEATURES.md](docs/FEATURES.md) | Feature catalogue and demo script |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | Scripts, layout, conventions, extending mocks |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Azure SWA hosting, Terraform, GitHub Actions |
| [OPERATIONS.md](docs/OPERATIONS.md) | Secret rotation, KQL alerts, incident response |

---

## Status

**Prototype — not production-ready.** No licence file is included; treat as demo source until a licence is added.
