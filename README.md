# Aether — Secure E2EE Dating Grid (Local Prototype)

**Aether** is a React + Vite app: discovery grid, Web Crypto E2EE chat, and a privacy centre for keys, EXIF tooling, and safety controls. Runs **standalone** (mock data) or against the optional **`api/`** service and Azure backend ([docs/BACKEND.md](docs/BACKEND.md)).

> **Disclaimer** — Not production-hardened. Real X25519/AES-GCM on the client; server stores **ciphertext and public keys only**. No raw GPS. See [docs/SECURITY.md](docs/SECURITY.md).

Clone path / npm package name: `optimistic-pasteur`.

---

## Features at a glance

### Discovery Grid

Fuzzed distance bands, generative avatars, stealth/invisible banner, profile detail → chat or secure album handoff. See [`src/components/Grid.jsx`](src/components/Grid.jsx).

### Encrypted Chats

1:1 and group threads, wire inspector, self-destruct timers, secure ephemeral album with focus blur shield, EXIF inspect/strip on JPEGs. See [`src/components/ChatRoom.jsx`](src/components/ChatRoom.jsx).

### Privacy Centre

Key ring display and rotation, location fuzzing strategy (persisted), album screenshot shield (persisted; native only), panic wipe, 30-day account deletion grace. Header tab: **Privacy Center**; bottom nav: **Security**. See [`src/components/PrivacyCenter.jsx`](src/components/PrivacyCenter.jsx).

### Native app

Capacitor wrapper in [`mobile/`](mobile/) loads the production build for iOS/Android. Web browsers remain album-blocked; native sends `X-Aether-Client: native`.

---

## Quick start

From the repo root (all platforms):

```bash
npm start
```

`npm start` runs [`scripts/start-dev.mjs`](scripts/start-dev.mjs): installs dependencies if `node_modules` is missing, then starts Vite and opens the default browser.

Requires **Node.js 18+**.

Other scripts:

```bash
npm run dev        # Vite dev server (no auto-open)
npm run dev:open   # Vite with browser open (deps already installed)
npm run build      # output: dist/
npm run preview    # serve production build
```

---

## Demo walkthrough

1. Open **Grid** → select a profile → **Message** to open chat.
2. Send a message → open **Wire Inspector** to view the ciphertext envelope.
3. Try a self-destruct timer or upload a JPEG in the EXIF panel and strip metadata.
4. Open **Security** (Privacy Centre) → inspect key ring → **Rotate Keys**.
5. Use header **Panic** or device wipe to clear local keys and return to Grid.

Full script: [docs/FEATURES.md](docs/FEATURES.md).

---

## Project structure

```text
api/                     # TypeScript REST API (optional)
infra/                   # Terraform — SWA + backend modules
mobile/                  # Capacitor iOS/Android shell (npm run mobile:setup)
src/
├── App.jsx              # Tabs, profiles, keys, panic wipe
├── api/client.js        # Backend client when VITE_API_URL set
├── utils/crypto.js      # Web Crypto E2EE
└── components/          # Grid, ChatRoom, PrivacyCenter, …
docs/                    # BACKEND, SECURITY, ARCHITECTURE, …
scripts/start-dev.mjs    # npm start launcher
```

---

## Tech stack

- React 19
- Vite 8
- lucide-react

No server runtime dependencies.

---

## Documentation

Full index: [docs/README.md](docs/README.md).

| Document | Description |
|----------|-------------|
| [docs/BACKEND.md](docs/BACKEND.md) | API services, data stores, schema, E2EE boundaries |
| [docs/SECURITY.md](docs/SECURITY.md) | Client crypto, threat model, privacy expectations |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Components, state, flows, crypto path, CSS conventions |
| [docs/FEATURES.md](docs/FEATURES.md) | Feature catalogue and 5-minute demo script |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Scripts, layout, conventions, extending mocks |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Azure SWA hosting, Terraform, GitHub Actions |
| [docs/DESIGN.md](docs/DESIGN.md) | Design criteria, plan vs built, screenshot policy |

Optional screenshots: `docs/images/` (see FEATURES.md).

---

## Status

**Prototype — not production-ready.** No licence file is included; treat as demo source until a licence is added.
