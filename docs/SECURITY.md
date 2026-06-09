# Aether — Security and Privacy Expectations

**Aether** ships as a React SPA with an **optional** backend (`api/` + Azure resources). Without `VITE_API_URL`, the app runs as a local-only demo with mock data. With the API enabled, transport and server-side rules below apply.

---

## Deployment modes

| Mode | Backend | Crypto | Data persistence |
|------|---------|--------|------------------|
| **Local demo** | None | Web Crypto in browser; mocks in React state | Keys + deletion timer in `localStorage` |
| **Dev + API** | `api/` + PostgreSQL | Web Crypto; ciphertext stored server-side | Keys local; public keys + envelopes on server |
| **Azure prod** | Container Apps + managed data plane | Same as dev + Entra JWT | Key Vault secrets; no public DB |

---

## Client cryptography (Web Crypto)

Implementation: [`src/utils/crypto.js`](../src/utils/crypto.js).

### What is real

- **Key generation** — ECDH on curve **X25519** via `crypto.subtle.generateKey`; public/private material exported as JWK.
- **Fingerprint** — SHA-256 over SPKI export of the public key, formatted as colon-separated hex.
- **1:1 encryption** — ECDH shared secret → SHA-256 → **AES-256-GCM** with random 12-byte IV; ciphertext Base64 in the envelope.
- **Group encryption** — Per-group AES-256-GCM key generated in the client; group key JWK stays in chat component state (not uploaded).

### What stays on the device

| Asset | Storage | Sent to server |
|-------|---------|----------------|
| Private key JWK | `localStorage` (`aether_user_keys`) | **Never** |
| Message plaintext | React state (decrypted for display) | **Never** |
| Public key JWK | Local copy + API registration | **Public JWK only** |

Legacy `AETH-PUB-*` / `AETH-PRV-*` keys are migrated automatically on next load.

### Wire / API envelope

Server and wire inspector see:

```json
{
  "cipherSuite": "ECDH-X25519-AES-256-GCM",
  "iv": "<base64>",
  "ciphertext": "<base64>",
  "keyId": "<device-uuid>"
}
```

Operators must not log or index decrypted content — there is none server-side.

---

## Server visibility (when API enabled)

| Data | Visible to operators | Notes |
|------|----------------------|-------|
| Entra OID / dev user id | Yes | Identity for auth |
| Profile text, fuzzed distance label | Yes | No raw GPS |
| Public key JWK + fingerprint | Yes | Required for E2EE discovery |
| Message ciphertext, IV, cipher suite | Yes (metadata) | **Not plaintext** |
| Blob path, content-type, expiry | Yes | Blob bytes are client-encrypted optional |
| Private keys | **No** | Must never appear in DB or logs |

See [BACKEND.md](BACKEND.md).

---

## EXIF: functional vs simulated

Implementation: [`src/utils/exif.js`](../src/utils/exif.js).

| Behaviour | Status |
|----------|--------|
| JPEG SOI / APP1 (`0xFFE1`) scan | **Functional** |
| Strip APP1 segments from JPEG | **Functional** |
| Inspector fields (camera, GPS, location text) | **Simulated** for demo when JPEG detected |
| Album upload to Blob | **When API + storage configured** — SAS upload after strip |

---

## `localStorage` keys

| Key | Contents | Panic wipe |
|-----|----------|------------|
| `aether_user_keys` | `deviceId`, `publicKeyJwk`, `privateKeyJwk`, `fingerprint` | Removed; new keypair generated |
| `aether_deletion_scheduled` | ISO purge time (synced with API when enabled) | Removed |

Panic wipe also calls `POST /api/v1/account/panic` and `POST /api/v1/keys/revoke` when the API is configured.

---

## UI-only vs enforced controls

| Control | Enforced when |
|---------|----------------|
| Location fuzzing strategy radios | API applies strategy (future); labels static in demo |
| PIN lock for secure album | UI toggle only |
| Album screenshot shield | Window focus / force shield |
| Stealth mode | Hides grid; server `discoverable` when API wired |
| Self-destruct timers | Client display + server `expires_at` on messages |

---

## Threat model

**Addressed (with API + Entra):**

- TLS in transit (Azure endpoints)
- JWT authentication for API routes
- Ciphertext-only persistence for chat
- Public-key-only registration

**Still required for production:**

- Formal security review and penetration test
- Hardware-backed key storage (WebAuthn / secure enclave)
- Signal-style forward secrecy (double ratchet)
- Rate limiting, WAF, APIM at public beta
- Multi-device key recovery policy

**Local demo assumptions:** trusted machine, no hostile extensions, single user.

---

## Verification checklist

1. API returns fuzzed distances only — never raw lat/long.
2. DB inspection shows no private keys or message plaintext.
3. Deletion worker removes PG rows and blobs for the user.
4. Realtime/poll delivers envelopes only to conversation members.
5. Panic wipe revokes server keys and locks the account.
