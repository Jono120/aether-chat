# Aether — Development Guide

Local setup and conventions for working on the **Aether** prototype. Repository folder name: `optimistic-pasteur` (`package.json` name); product name in UI and docs: **Aether**.

---

## Prerequisites

- **Node.js** 18 or newer
- **npm** (bundled with Node)

No database, Docker, or API keys required.

---

## Scripts

From [`package.json`](../package.json):

| Command | Purpose |
|---------|---------|
| `npm start` | Install deps if needed, then Vite dev server with browser open ([`scripts/start-dev.mjs`](../scripts/start-dev.mjs)) |
| `npm run dev` | Vite dev server with HMR (default port 5173) |
| `npm run dev:open` | Vite dev server and open browser (no install check) |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm run lint` | ESLint over the project |

---

## Repository layout

```text
optimistic-pasteur/
├── docs/                 # SECURITY, ARCHITECTURE, FEATURES, DEVELOPMENT
├── public/               # Static assets (favicon)
├── src/
│   ├── App.jsx           # Root state, profiles, panic wipe, tab routing
│   ├── main.jsx          # React entry
│   ├── index.css         # Semantic design system
│   ├── components/
│   │   ├── Navigation.jsx
│   │   ├── Grid.jsx
│   │   ├── ChatRoom.jsx
│   │   └── PrivacyCenter.jsx
│   └── utils/
│       ├── crypto.js     # E2EE simulator
│       └── exif.js       # JPEG EXIF inspect/strip
├── scripts/
│   └── start-dev.mjs     # npm start launcher
├── index.html            # Page title and meta
├── package.json
├── vite.config.js
└── eslint.config.js
```

---

## Conventions

- **Components:** Functional React with hooks; props passed from `App.jsx` for global concerns.
- **Utilities:** JSDoc on exported functions in `src/utils/`.
- **Styling:** Prefer semantic classes from `index.css`; document new classes in the component header comment.
- **Icons:** `lucide-react` imports per component.
- **Naming:** Product strings use **Aether**; storage keys prefixed `aether_`.

---

## Adding a mock profile

1. Append an object to the `profiles` array in [`src/App.jsx`](../src/App.jsx) (`id`, `username`, `fuzzedDistance`, colors, `hasSecureAlbum`, etc.).
2. Optional: seed messages in `ChatRoom.jsx` `conversations` under the same `id` key.
3. Optional: add `getKeysForPartner` public key mapping in `ChatRoom.jsx` for realistic wire inspector labels.

---

## Modifying crypto or EXIF

| Module | Path | If you change behavior |
|--------|------|-------------------------|
| Crypto simulator | `src/utils/crypto.js` | Update [SECURITY.md](SECURITY.md) and wire-inspector-related copy in [FEATURES.md](FEATURES.md) |
| EXIF tools | `src/utils/exif.js` | Update SECURITY.md (functional vs simulated sections) |

Do not present `simpleCipher` or hex key strings as production cryptography in user-facing text.

---

## ESLint

```bash
npm run lint
```

Config: [`eslint.config.js`](../eslint.config.js) — flat config with React Hooks and React Refresh plugins.

---

## Build output and hosting

```bash
npm run build
```

Output directory: `dist/`. Any static host (S3, Netlify, GitHub Pages, etc.) can serve the folder. Environment has no server-side secrets in this prototype; still avoid embedding real private keys in source.

---

## Documentation index

| Doc | Topic |
|-----|--------|
| [SECURITY.md](SECURITY.md) | Prototype limits, simulated vs real behavior |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Components, state, flows |
| [FEATURES.md](FEATURES.md) | Feature catalog and demo script |
| [DEVELOPMENT.md](DEVELOPMENT.md) | This file |
| [DESIGN.md](DESIGN.md) | Design criteria and plan vs built |

---

## Verification

Run after substantive changes:

```bash
npm run build
```

Expect a clean Vite production build.

### Manual checklist

| # | Check |
|---|--------|
| 1 | `npm start` or `npm run dev` opens app at localhost |
| 2 | Grid profiles, modal, Message → chat handoff |
| 3 | Stealth hides discovery grid (empty state, no profile clicks) |
| 4 | Chat send + **Wire View** shows packet JSON |
| 5 | JPEG EXIF inspect + **Strip EXIF & Send Secure** |
| 6 | Album unlock countdown + blur on Alt+Tab when shield toggle on |
| 7 | Privacy: rotate keys, deletion countdown, cancel |
| 8 | Panic: LS cleared, stealth on, new keys, chat remount |
| 9 | Regular chat copyable; album shield scoped to album |
| 10 | Mobile bottom nav: Grid / Chat / Security |

Last verified: 2026-05-21 — build passed; stealth grid hide, album shield wiring, stable group key `GRP-KID-105` implemented in code review pass.
