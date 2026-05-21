# Aether — Feature Catalog and Demo Script

Feature reference for stakeholders and evaluators. For security boundaries see [SECURITY.md](SECURITY.md); for code layout see [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Discovery Grid

**What it shows:** Six mock nearby profiles with generative SVG avatars, fuzzed distance bands, tags, and role lines.

**How to trigger:** Open app → **Grid** tab (default) or header **Discovery Grid**.

**Implementation note:** Data from `profiles` in [`src/App.jsx`](../src/App.jsx). Distances are static strings, not live geolocation.

---

## Stealth mode (invisible)

**What it shows:** Red warning banner on Grid; header badge indicates invisible state.

**How to trigger:** Header eye toggle, account deletion request in Privacy Center, or panic wipe (enables stealth).

**Implementation note:** `stealthMode` in `App.jsx` hides the discovery grid and shows an empty state; profile cards are not clickable until visibility is restored.

---

## Profile modal

**What it shows:** Bio, tags, distance band, **Message** and **Secure Album** actions.

**How to trigger:** Tap a profile card on the Grid.

**Implementation note:** `Grid.jsx` modal → `onSelectChat(profile, false | true)`.

---

## 1:1 and group chat

**What it shows:** Sidebar threads (Julian, Alex, City Safe Haven group); pre-seeded history; send box with optional self-destruct.

**How to trigger:** **Chat** tab, or **Message** from a profile.

**Implementation note:** `conversations` state in `ChatRoom.jsx`; 1:1 auto-reply after ~2.5s via `simulatePartnerResponse`.

---

## E2EE wire inspector

**What it shows:** JSON of the last transmitted packet (header + payload) with algorithm labels.

**How to trigger:** In an active chat → shield/wire control → **Wire Inspector** panel.

**Implementation note:** `lastTransmittedPacket` updated on each send/reply; cryptography is simulated — see [SECURITY.md](SECURITY.md).

---

## Self-destruct messages

**What it shows:** Timer chips on send (e.g. 10s / 30s / 60s); messages removed when `expiresAt` passes.

**How to trigger:** Select a destruct duration before sending a message.

**Implementation note:** Interval loop in `ChatRoom.jsx` filters expired messages from state.

---

## Secure ephemeral album

**What it shows:** Timed photo cards; blur overlay when window loses focus (screen shield).

**How to trigger:** Profile modal **Secure Album**, or album icon in chat header when linked from Grid.

**Implementation note:** `albumPhotos` mock data; blur when `albumScreenshotShield` (Privacy Center) is on and the window loses focus or **Test Blur Shield** is used — not OS-level screenshot blocking.

---

## EXIF inspector and stripper

**What it shows:** Upload JPEG → metadata fields; strip removes APP1; optional quality slider on export path.

**How to trigger:** Chat → EXIF / camera panel → choose image file.

**Implementation note:** [`src/utils/exif.js`](../src/utils/exif.js) — strip is functional for JPEG APP1; displayed GPS/camera fields are largely demo metadata.

---

## Cryptographic key ring

**What it shows:** Public key, private key (local), fingerprint in Privacy Center.

**How to trigger:** **Security** bottom nav → Privacy Center → **Cryptographic Key Ring** card.

**Implementation note:** Keys from `currentUser.keys` / `aether_user_keys`.

---

## Key rotation

**What it shows:** Alert confirming new fingerprint; updated key strings in UI.

**How to trigger:** Privacy Center → **Rotate Keys**.

**Implementation note:** `handleRotateKeys` in `App.jsx` → `generateKeyPair` → `localStorage`.

---

## Panic button

**What it shows:** Confirm modal → wipe alert → stealth on, Grid tab, new keys.

**How to trigger:** Header flame (**Panic**) or Privacy Center **Wipe Device Data**.

**Implementation note:** `handlePanicTrigger` clears LS keys and deletion schedule; chat state resets on navigation/reload behavior.

---

## Account deletion (30-day grace)

**What it shows:** Countdown timer; stealth enabled while pending; auto panic when timer expires.

**How to trigger:** Privacy Center → request account deletion; cancel restores stealth off.

**Implementation note:** `aether_deletion_scheduled` ISO timestamp; `calculateTimeRemaining` calls `onPanicTrigger` when expired.

---

## Location fuzzing strategies

**What it shows:** Three radio options: Grid Snapping, Gaussian Jitter, Broad Distance Bands.

**How to trigger:** Privacy Center → **Location & Visibility** card.

**Implementation note:** `fuzzingStrategy` React state only — does not change Grid profile distances in this prototype.

---

## 5-minute demo script

1. **Start** — Run `npm start`; confirm title **Aether — Secure E2EE Dating Grid**.
2. **Grid** — Browse profiles; open **Julian** → read bio and distance band.
3. **Stealth** — Toggle invisible in header; note Grid warning banner.
4. **Chat handoff** — **Message** Julian → lands in 1:1 chat with seeded thread.
5. **Send + wire** — Type a message; optional 10s self-destruct; open **Wire Inspector** and show last packet JSON.
6. **Album** — Back to Grid → profile with secure album → **Secure Album**; blur by switching away from the browser window.
7. **EXIF** — In chat, open EXIF panel, upload a JPEG, inspect, then strip and note size change.
8. **Privacy Center** — **Security** tab; show key ring → **Rotate Keys**.
9. **Fuzzing UI** — Select a different distance fuzzing strategy (explain UI-only).
10. **Panic** — Header panic confirm → verify alert, Grid return, new keys; mention LS keys cleared per [SECURITY.md](SECURITY.md).

---

## Screenshots (optional)

Place captures under `docs/images/` when available, for example:

- `docs/images/grid-profiles.png`
- `docs/images/wire-inspector.png`
- `docs/images/privacy-keyring.png`

The README links here; images are not required to run the prototype.
