# Aether — Development Guide

Local setup and conventions for working on the **Aether** prototype. Repository folder name: `optimistic-pasteur` (`package.json` name); product name in UI and docs: **Aether**.

---

## Prerequisites

- **Node.js** 18 or newer
- **npm** (bundled with Node)

No database required for UI-only work. Optional API stack: Docker PostgreSQL + `api/` (see below).

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
├── api/                  # TypeScript REST API (profiles, keys, chat, media)
├── docs/                 # SECURITY, ARCHITECTURE, BACKEND, DATA_MODEL, …
├── infra/                # Terraform (SWA + optional backend modules)
├── public/               # Static assets (favicon)
├── src/
│   ├── api/client.js     # API client (when VITE_API_URL set)
│   ├── App.jsx           # Root state, profiles, panic wipe, tab routing
│   ├── main.jsx          # React entry (ToastProvider wrapper)
│   ├── index.css         # Semantic design system (tokens / base / utilities / components)
│   ├── context/
│   │   └── ToastContext.jsx
│   ├── hooks/
│   │   └── useFocusTrap.js
│   ├── components/
│   │   ├── Navigation.jsx
│   │   ├── Grid.jsx
│   │   ├── ChatRoom.jsx
│   │   ├── PrivacyCenter.jsx
│   │   └── Toast.jsx
│   └── utils/
│       ├── crypto.js     # Web Crypto X25519 + AES-GCM
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
- **Styling:** Prefer semantic classes from `index.css`; document new classes in the component header comment. Layers: tokens → base → utilities → components.
- **Toasts:** Use `useToast()` from `ToastContext` instead of `alert()` or `window.confirm()`.
- **Modals:** Pair `useFocusTrap` with Escape handler for keyboard accessibility.
- **Icons:** `lucide-react` imports per component.
- **Naming:** Product strings use **Aether**; storage keys prefixed `aether_`.

---

## Full-stack local development

```bash
# PostgreSQL
docker run -d --name aether-pg -e POSTGRES_USER=aetheradmin -e POSTGRES_PASSWORD=aether -e POSTGRES_DB=aether -p 5432:5432 postgres:16

# API (terminal 1)
cd api && cp .env.example .env && npm install && npm run migrate && npm run seed && npm run dev

# SPA (terminal 2)
cp .env.example .env
npm run dev
```

`.env` for the SPA:

```env
VITE_API_URL=http://localhost:8080
VITE_DEV_USER_ID=dev-user-1
```

The API accepts `X-Dev-User-Id` when `DEV_AUTH_BYPASS=true` (default in `api/.env.example`).

---

## Adding profiles

**With API:** `npm run seed` in `api/` or insert rows in PostgreSQL.

**Without API:** append to `MOCK_PROFILES` in [`src/App.jsx`](../src/App.jsx).

---

## Modifying crypto or EXIF

| Module | Path | If you change behaviour |
|--------|------|-------------------------|
| Web Crypto | `src/utils/crypto.js` | Update [SECURITY.md](SECURITY.md) |
| EXIF tools | `src/utils/exif.js` | Update SECURITY.md (functional vs simulated sections) |
| API | `api/src/` | Update [BACKEND.md](BACKEND.md) and [DATA_MODEL.md](DATA_MODEL.md) |

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

Output directory: `dist/`. Vite copies [public/staticwebapp.config.json](../public/staticwebapp.config.json) into `dist/` for SPA routing and security headers on Azure Static Web Apps.

For Azure hosting, Terraform, and GitHub Actions pipelines, see [DEPLOYMENT.md](DEPLOYMENT.md) and [infra/README.md](../infra/README.md).

---

## Documentation index

See [README.md](README.md) in this folder for the full map.

| Doc | Topic |
|-----|--------|
| [project-summary.md](project-summary.md) | Executive summary and architecture overview |
| [SECURITY.md](SECURITY.md) | Prototype limits, simulated vs real behaviour |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Components, state, flows |
| [FEATURES.md](FEATURES.md) | Feature catalogue and demo script |
| [DEVELOPMENT.md](DEVELOPMENT.md) | This file |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Azure SWA, Terraform, CI/CD |
| [BACKEND.md](BACKEND.md) | API services and E2EE boundaries |
| [DATA_MODEL.md](DATA_MODEL.md) | Database schema |
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

### Visual QA (UI modernisation)

Run at **desktop (≥768px)** and **mobile (<768px)** unless noted.

| # | Check |
|---|--------|
| V1 | **Chat mobile:** contact list **or** thread visible, not both; back arrow returns to list |
| V2 | **Icons:** Lucide icons use consistent `.icon-sm` / `.icon-md` sizing in header, grid modal, chat toolbar |
| V3 | **Focus:** Tab through header tabs, panic modal, strategy radios — visible `:focus-visible` ring on all interactive elements |
| V4 | **Reduced motion:** enable OS “reduce motion”; no pulse on panic button, countdown banner, album shield, or skeleton shimmer |
| V5 | **Toasts:** key rotate, panic wipe, deletion schedule/cancel, device wipe confirm — toast UI, not blocking `alert`/`confirm` |
| V6 | **Tab fade:** switching Grid / Chat / Security shows subtle content fade (disabled under reduced motion) |
| V7 | **Grid entrance:** profile cards stagger in on load (disabled under reduced motion) |
| V8 | **Chat messages:** new sent/received bubbles use `.message-enter` micro-animation |
| V9 | **Modals:** profile modal and panic modal trap focus; Escape closes; backdrop click closes profile modal |
| V10 | **Scrollbars:** chat contact list, message pane, album viewport use `.custom-scrollbar` styling |
| V11 | **Easier reading font:** Lexend is the default app font; Settings → Accessibility → toggle off **Easier reading font** to verify classic Outfit font; wire inspector and EXIF panels stay monospace; setting persists after reload |

Last verified: 2026-06-02 — `npm run build` passed; docs aligned with React 19 / Vite 8 client-only prototype.
