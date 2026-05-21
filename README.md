# Aether — Secure E2EE Dating Grid (Local Prototype)

**Aether** is a client-only React + Vite prototype: a discovery grid, simulated end-to-end encrypted chat, and a privacy center for keys, EXIF tooling, and local safety controls. Everything runs in the browser with mock data.

> **Prototype disclaimer** — There is **no backend**, **no real E2EE**, and **no live location**. Profiles and threads are mocked; cryptography labels are cosmetic. Use for UX and security **concept demos only**. See [docs/SECURITY.md](docs/SECURITY.md) before treating any control as production-grade.

Clone path / npm package name: `optimistic-pasteur`.

---

## Features at a glance

### Discovery Grid

Fuzzed distance bands, generative avatars, stealth/invisible banner, profile detail → chat or secure album handoff. See [`src/components/Grid.jsx`](src/components/Grid.jsx).

### Encrypted Chats

1:1 and group threads, wire inspector, self-destruct timers, secure ephemeral album with focus blur shield, EXIF inspect/strip on JPEGs. See [`src/components/ChatRoom.jsx`](src/components/ChatRoom.jsx).

### Privacy Center

Key ring display and rotation, location fuzzing strategy radios (UI-only), PIN/album shield toggles (UI-only), panic wipe, 30-day account deletion grace. Header tab: **Privacy Center**; bottom nav: **Security**. See [`src/components/PrivacyCenter.jsx`](src/components/PrivacyCenter.jsx).

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
2. Send a message → open **Wire Inspector** to view the simulated packet.
3. Try a self-destruct timer or upload a JPEG in the EXIF panel and strip metadata.
4. Open **Security** (Privacy Center) → inspect key ring → **Rotate Keys**.
5. Use header **Panic** or device wipe to clear local keys and return to Grid.

Full script: [docs/FEATURES.md](docs/FEATURES.md).

---

## Project structure

```text
src/
├── App.jsx              # Tabs, profiles, keys, panic wipe
├── main.jsx
├── index.css            # Semantic styling
├── components/
│   ├── Navigation.jsx
│   ├── Grid.jsx
│   ├── ChatRoom.jsx
│   └── PrivacyCenter.jsx
└── utils/
    ├── crypto.js        # E2EE simulator
    └── exif.js          # JPEG EXIF tools
docs/                    # SECURITY, ARCHITECTURE, FEATURES, DEVELOPMENT, DESIGN
scripts/start-dev.mjs    # npm start launcher (install + vite --open)
```

---

## Tech stack

- React 19
- Vite 8
- lucide-react

No server runtime dependencies.

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/SECURITY.md](docs/SECURITY.md) | Prototype scope, simulated vs real behavior, `localStorage`, threat model |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Components, state, flows, crypto path, CSS conventions |
| [docs/FEATURES.md](docs/FEATURES.md) | Feature catalog and 5-minute demo script |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Scripts, layout, conventions, extending mocks |
| [docs/DESIGN.md](docs/DESIGN.md) | Design criteria, plan vs built, screenshot policy |

Optional screenshots: `docs/images/` (see FEATURES.md).

---

## Status

**Prototype — not production-ready.** No license file is included; treat as demo source until a license is added.
