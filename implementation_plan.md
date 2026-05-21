# Implementation Plan - Aether (Privacy-First Dating App)

> **Superseded by maintained docs** — Kept for history. Current source of truth:
>
> - [docs/DESIGN.md](docs/DESIGN.md) — design criteria and plan vs built
> - [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — components, state, flows
> - [docs/FEATURES.md](docs/FEATURES.md) — feature catalog and demo script
> - [README.md](README.md) — quick start
>
> **Status:** Proposed file list below is **completed** (vanilla CSS instead of Tailwind; simulated crypto instead of Web Crypto API).

---

Aether is a privacy-first dating application prototype that focuses on location safety, end-to-end encrypted messaging, metadata-free photo sharing, and robust account controls.

## Design Refinements & User Feedback Incorporated

> [!NOTE]
> Based on your feedback, we have adjusted the design criteria:
> 1. **No Real Location Maps**: The user interface will not show any maps exposing precise real-time coordinates. The location engine operates behind the scenes (simulated backend control), displaying profiles on the grid with fuzzed distance categories (e.g., "Nearby", "Within 1 mile") to prevent trilateration.
> 2. **Emergency Screenshot Support**: Screenshot and copy limitations will only apply to secure albums (disappearing media). Regular chat threads and profiles will remain copyable/screenshot-friendly so users can preserve records for personal safety or emergency services.
> 3. **Account Deletion Grace Period**: The "Panic Wipe" function will instantly erase local data (messages, cached profiles, local keys) and schedule the database account record for permanent deletion in 30 days.
> 4. **Invisible Mode**: The user can toggle their grid presence on or off directly, simulating backend-controlled location presence.
> 5. **Fully Documented CSS**: All stylesheets will contain descriptive comments explaining color tokens, layout decisions, responsive media queries, and animations.

---

## Core Features

### 1. Discovery Grid (Responsive Card UI)
- Sleek grid of nearby profiles that scales seamlessly from mobile to wide desktop monitors.
- Cards show profile pictures, age, role, and a fuzzed distance band (e.g., "Under 1 km away", "Within 5 km").
- Active status and distance details are calculated based on backend-enforced coordinate fuzzing.

### 2. Location Obfuscation Engine & Settings
- **Backend-Enforced Fuzzing**: A configuration panel representing how the backend obfuscates data.
- **Presence Control**: "Show on Grid" toggle. When disabled, the user is completely hidden from the grid.
- **Fuzzing Profiles**: Select between "Grid Snap" (1km squares), "Randomized Radius" (offsetting position on the server), or "Fuzzy Distance Only".

### 3. Secure Ephemeral Album & Photo Stripper
- **EXIF Inspector**: Allows uploading an image, extracts and lists any metadata (such as device model, capture time, and GPS coordinates), and performs a client-side strip.
- **Private Secure Album**: A section for single-view and timed-release photos. 
- **Album Screen Shield**: Simulates privacy protections (disabling context menus, blurring on window defocus) strictly for the album section, ensuring secure photos cannot be easily captured while allowing standard chats to be screenshotted for safety.

### 4. Encrypted P2P & Group Chats
- **E2EE Simulation**: Public/private key generation using the Web Crypto API.
- **Network Wire Inspector**: Let users toggle a debugging view to inspect the encrypted payload (ciphertext) vs. the decrypted message.
- **Simulated Group Chats**: Secure group chat rooms with rotating key simulations.
- **Timed Auto-Destruct**: Expiry timers on individual messages.

### 5. Self-Destruct / Account Erasure Panel
- **Immediate Local Wipe**: Erases keys, active chats, and cached files from LocalStorage/IndexedDB.
- **Database Deletion (30-Day Delay)**: Sets an account deletion flag. The UI will show a countdown warning of the 30-day grace period, allowing the user to cancel deletion if desired, but hiding them from the platform in the meantime.

---

## Proposed Changes

### Project Setup
#### [NEW] [package.json](file:///C:/Users/jlake/Documents/antigravity/optimistic-pasteur/package.json) - Node package configurations.
#### [NEW] [vite.config.js](file:///C:/Users/jlake/Documents/antigravity/optimistic-pasteur/vite.config.js) - Vite configuration.
#### [NEW] [tailwind.config.js](file:///C:/Users/jlake/Documents/antigravity/optimistic-pasteur/tailwind.config.js) - Tailored styling presets.
#### [NEW] [postcss.config.js](file:///C:/Users/jlake/Documents/antigravity/optimistic-pasteur/postcss.config.js) - PostCSS support.
#### [NEW] [index.html](file:///C:/Users/jlake/Documents/antigravity/optimistic-pasteur/index.html) - Root layout.

### Styling & Layout
#### [NEW] [src/index.css](file:///C:/Users/jlake/Documents/antigravity/optimistic-pasteur/src/index.css)
- CSS variables for colors (glassmorphic dark backgrounds, glow shadows).
- Extensive commenting detailing each style connection, layout rule, and animation.

### Codebase Components
#### [NEW] [src/main.jsx](file:///C:/Users/jlake/Documents/antigravity/optimistic-pasteur/src/main.jsx) - Entrypoint.
#### [NEW] [src/App.jsx](file:///C:/Users/jlake/Documents/antigravity/optimistic-pasteur/src/App.jsx) - Primary application and state manager.
#### [NEW] [src/utils/crypto.js](file:///C:/Users/jlake/Documents/antigravity/optimistic-pasteur/src/utils/crypto.js) - Cryptographic helpers.
#### [NEW] [src/utils/exif.js](file:///C:/Users/jlake/Documents/antigravity/optimistic-pasteur/src/utils/exif.js) - EXIF metadata parsing and cleaning.
#### [NEW] [src/components/Navigation.jsx](file:///C:/Users/jlake/Documents/antigravity/optimistic-pasteur/src/components/Navigation.jsx) - Top-bar with visibility statuses.
#### [NEW] [src/components/Grid.jsx](file:///C:/Users/jlake/Documents/antigravity/optimistic-pasteur/src/components/Grid.jsx) - Profile display grid.
#### [NEW] [src/components/ChatRoom.jsx](file:///C:/Users/jlake/Documents/antigravity/optimistic-pasteur/src/components/ChatRoom.jsx) - Cryptographic messages and photo album.
#### [NEW] [src/components/PrivacyCenter.jsx](file:///C:/Users/jlake/Documents/antigravity/optimistic-pasteur/src/components/PrivacyCenter.jsx) - Privacy adjustments and account erasure tracker.

---

## Verification Plan

### Automated Tests
- Run `npm run build` to verify standard build integrity.

### Manual Verification
- Verify visibility toggles disable grid listing.
- Verify chats and profiles permit normal capture, while secure albums blur on defocus.
- Verify account deletion sets a 30-day grace timer and locks access.
