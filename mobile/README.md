# Aether mobile (Capacitor)

Native iOS and Android wrapper for the Aether web app. The shell loads the Vite build from `../dist` and sets `window.Capacitor.isNativePlatform()` so private albums and `X-Aether-Client: native` work in production.

## Prerequisites

- Node.js 18+
- **iOS:** macOS with Xcode 15+
- **Android:** Android Studio with SDK 35+
- **Store uploads:** Ruby + Bundler (`bundle install` in `mobile/`)

## First-time setup

From the repo root:

```bash
npm install          # includes @capacitor/core, app, splash-screen for the SPA
npm run mobile:setup # build SPA, npm install in mobile/, cap add android, cap sync
```

On **macOS**, add iOS after setup (already committed in this repo; re-run only if the platform was removed):

```bash
cd mobile && npx cap add ios && npx cap sync
```

## Day-to-day workflow

```bash
npm run mobile:sync           # rebuild dist/ and cap sync
npm run mobile:open:android   # Android Studio
npm run mobile:open:ios       # Xcode (macOS only)
```

Run on a device or emulator from the native IDE.

## CI scripts

| Script | Purpose |
|--------|---------|
| `npm run mobile:install` | `npm ci` in `mobile/` |
| `npm run mobile:build:ci` | Build SPA + `cap sync` (set `SKIP_SPA_BUILD=true` to reuse `dist/`) |
| `npm run mobile:android:debug` | Unsigned debug APK (`assembleDebug`) |
| `npm run mobile:android:release` | Signed release AAB when keystore env vars are set |
| `npm run mobile:ios:sim` | Simulator build via `xcodebuild` |

## What the native shell enables

| Feature | Web browser | Capacitor native |
|---------|-------------|------------------|
| Private album UI | Blocked (banner) | Enabled |
| Album upload SAS | 403 | Allowed (`X-Aether-Client: native`) |
| Screenshot shield defocus | Window blur only | `@capacitor/app` background events |
| Splash screen | — | Auto-hide on launch (`#0f0f14`) |

## Environment

Point the built SPA at your API (same as web):

```env
# root .env — baked into dist/ at build time
VITE_API_URL=https://api.example.com
VITE_SIGNALR_URL=https://...
```

Store URLs for the **web** album banner (not shown in native album UI):

```env
VITE_IOS_APP_STORE_URL=https://apps.apple.com/app/idXXXXXXXXX
VITE_ANDROID_PLAY_STORE_URL=https://play.google.com/store/apps/details?id=com.aether.app
```

Rebuild after env changes: `npm run mobile:sync`.

## Project layout

```text
mobile/
├── capacitor.config.ts   # appId com.aether.app, webDir ../dist
├── android/              # committed; synced web assets are gitignored
├── ios/                  # committed; synced public/ assets are gitignored
├── fastlane/             # Play + App Store upload lanes
├── Gemfile
└── package.json          # @capacitor/cli, ios, android plugins
```

## Release workflow (GitHub Actions)

Releases are **not** tied to every `main` push. Use the **Deploy mobile** workflow (`.github/workflows/deploy-mobile.yml`).

### Manual dispatch

Actions → **Deploy mobile** → **Run workflow**:

| Input | Options |
|-------|---------|
| `platform` | `all`, `android`, `ios` |
| `channel` | `internal` (Play internal), `testflight`, `production` |
| `version` | Optional semver; defaults to `mobile/package.json` |

- `internal` → Play **internal** track (`mobile-staging` environment)
- `testflight` → TestFlight upload (`mobile-staging`)
- `production` → Play production (10% rollout) or App Store review (`mobile-production`, requires approval)

### Tag releases

Push a tag `mobile-v{semver}` (e.g. `mobile-v0.1.0`) to upload Android to **internal** and iOS to **TestFlight** automatically.

### Fastlane (local dry-run)

From `mobile/` after a signed build:

```bash
bundle install
export AAB_PATH=../android/app/build/outputs/bundle/release/app-release.aab
export PLAY_STORE_SERVICE_ACCOUNT_JSON='…'
bundle exec fastlane android_internal --verbose

export IPA_PATH=/path/to/App.ipa
export APP_STORE_CONNECT_API_KEY_ID=…
export APP_STORE_CONNECT_API_ISSUER_ID=…
export APP_STORE_CONNECT_API_KEY_CONTENT=…   # base64 .p8
bundle exec fastlane ios_beta --verbose
```

Add `--skip_upload` to `supply` / `pilot` in the Fastfile when testing locally.

### Required GitHub configuration

See [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md#mobile-ci-and-release) for secrets, variables, and one-time Play / App Store setup.

## Troubleshooting

- **Blank WebView:** run `npm run mobile:sync` after every SPA change
- **`isNativeApp()` false in simulator:** ensure you opened the **native** project, not the web URL in Safari/Chrome
- **Album still blocked:** confirm Capacitor injected `window.Capacitor` (check WebView inspector)
- **First Play upload rejected:** create the app in Play Console and upload the first AAB manually if the API has no app record yet
