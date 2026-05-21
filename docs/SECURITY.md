# Aether — Security and Privacy Expectations

**Aether** is a **client-only local prototype**. Nothing in this repository provides production-grade security. Read this document before evaluating crypto, location, or privacy features.

---

## Prototype scope

| Aspect | Reality in this repo |
|--------|----------------------|
| Backend / API | **None** — no server, no network transport for chat or profiles |
| User data | Mock profiles and pre-seeded conversations in React state |
| Persistence | Only cryptographic keys and account-deletion scheduling in `localStorage` |
| Chat history | Lives in `ChatRoom` component state; cleared on full page reload (except keys/deletion timer in LS) |
| Location | Fuzzed distance **strings** on mock profiles — not GPS or geolocation APIs |

Suitable for **UX demos**, **security concept walkthroughs**, and **local development** only.

---

## Simulated cryptography

Implementation: [`src/utils/crypto.js`](../src/utils/crypto.js).

### What is simulated

- **Key generation** — Random hex strings formatted as `AETH-PUB-*` / `AETH-PRV-*` with a colon-separated fingerprint. Not ECDH, RSA, or X25519.
- **1:1 encryption** — `encryptMessage` / `decryptMessage` use a deterministic character-shift (`simpleCipher`) keyed off truncated key suffixes, then Base64. Labels such as `ECDH-X25519-AES-256-GCM` and `Aether-E2EE-1.0` are **cosmetic**.
- **Group encryption** — `generateGroupKey`, `encryptGroupMessage`, `decryptGroupMessage` use the same pattern with a rotating mock group key ID.
- **Wire inspector** — Displays the last JSON packet object built on send; it does not reflect real network traffic.

### What actually happens on send

1. Plaintext is stored in conversation state for display.
2. A mock packet object is built and stored in `lastTransmittedPacket`.
3. Incoming auto-replies use hard-coded mock partner private keys.

Anyone with browser devtools can read plaintext messages and keys in memory or storage.

---

## EXIF: functional vs simulated

Implementation: [`src/utils/exif.js`](../src/utils/exif.js).

| Behavior | Status |
|----------|--------|
| JPEG SOI / APP1 (`0xFFE1`) scan | **Functional** — reads file bytes in the browser |
| Strip APP1 segments from JPEG | **Functional** — rebuilds blob without EXIF/GPS APP1 blocks |
| Non-JPEG files | Original file returned; no binary strip |
| Inspector fields (camera, GPS, location text) | **Mostly simulated** — realistic mock metadata for demo when a JPEG is detected; not a full EXIF parser |

Stripping reduces metadata embedded in JPEG APP1 segments on the client; it does not guarantee removal of all privacy-relevant data in every format.

---

## `localStorage` keys

| Key | Written by | Contents | Cleared by panic wipe |
|-----|------------|----------|------------------------|
| `aether_user_keys` | `App.jsx` on startup / key rotation / panic | JSON: `publicKey`, `privateKey`, `fingerprint`, `createdAt` | Yes — then new keys generated |
| `aether_deletion_scheduled` | `PrivacyCenter.jsx` on account deletion request | ISO timestamp 30 days in the future | Yes |

Panic wipe (`handlePanicTrigger` in `App.jsx`) also sets stealth mode, clears active chat routing, regenerates keys, and routes to the Grid tab. It does **not** persist chat threads (they were never in LS).

---

## UI-only controls

These affect labels, toggles, or local UI state only — not enforced security boundaries:

| Control | Location | Notes |
|---------|----------|-------|
| Location fuzzing strategy radios | Privacy Center | `fuzzingStrategy` state (`grid_snap`, `jitter`, `distance_only`) — not wired to Grid distances |
| PIN lock for secure album | Privacy Center | Toggle only; no PIN entry or gate |
| Album screenshot shield | Privacy Center | Toggle; album blur in Chat uses window `focus`/`blur` and optional force shield |
| Stealth / invisible mode | Header + Privacy Center | Banner on Grid; does not remove profiles from the mock grid |
| Self-destruct timers | Chat | Client-side expiry loop removes messages from React state |

---

## Threat model (prototype)

**Not addressed** in this build:

- Malicious extensions, XSS, or compromised shared machines
- Physical access reading `localStorage` or memory
- Network adversaries (no transport layer)
- Key escrow, recovery, or multi-device sync
- Forward secrecy, authenticated encryption, or side-channel resistance

**Assumed for demos:** trusted local browser, single user, no hostile scripts on the page.

---

## Production path (out of scope)

A production Aether-style product would require, at minimum:

- Real protocols (e.g. Signal-style double ratchet or Web Crypto–backed AEAD with proper key agreement)
- Authenticated backend, secure transport (TLS), and audited key storage
- Server-side location fuzzing with a defined privacy policy
- Security review, penetration testing, and incident response

This repository intentionally stops at interactive UI and educational simulation.
