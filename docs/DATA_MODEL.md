# Aether — Data Model

PostgreSQL is the **system of record** for users, profiles, keys, messages (MVP), media metadata, and deletion schedules. Blob Storage holds encrypted album bytes. Optional Cosmos DB and Redis are gated by Terraform flags.

---

## Store boundaries

| Store | Holds | Must NOT hold |
|-------|-------|---------------|
| **PostgreSQL** | Users, profiles, prefs, public keys, message envelopes, media metadata, deletion requests | Private keys, plaintext messages, raw lat/long |
| **Blob Storage** | Encrypted JPEG/binary album objects | Public containers, long-lived SAS without expiry |
| **Redis** (optional) | Presence, rate limits, SignalR backplane | Durable compliance data |
| **Cosmos DB** (optional) | High-volume message documents at scale | Plaintext payloads |
| **Service Bus** | Deletion job messages (user id, scheduled time) | Message content |

---

## Entity relationship diagram

```mermaid
erDiagram
  users ||--o| profiles : has
  users ||--o{ user_preferences : has
  users ||--o{ device_public_keys : registers
  users ||--o{ deletion_requests : schedules
  users ||--o{ media_objects : owns
  users ||--o{ conversation_members : joins
  conversations ||--o{ conversation_members : contains
  conversations ||--o{ messages : contains
  users ||--o{ messages : sends

  users {
    uuid id PK
    text entra_oid UK
    text status
    timestamptz created_at
  }
  profiles {
    uuid user_id PK_FK
    text display_name
    text bio
    text role_label
    int age
    text fuzzed_distance_label
    boolean discoverable
    jsonb avatar_colors
    jsonb tags
    boolean has_secure_album
  }
  user_preferences {
    uuid user_id PK_FK
    text fuzzing_strategy
    boolean album_shield_enabled
  }
  device_public_keys {
    uuid id PK
    uuid user_id FK
    text device_id
    jsonb public_key_jwk
    text fingerprint
    timestamptz revoked_at
  }
  conversations {
    uuid id PK
    boolean is_group
    text title
  }
  conversation_members {
    uuid conversation_id FK
    uuid user_id FK
  }
  messages {
    uuid id PK
    uuid conversation_id FK
    uuid sender_user_id FK
    text ciphertext
    text cipher_suite
    text iv
    text key_id
    timestamptz sent_at
    timestamptz expires_at
  }
  media_objects {
    uuid id PK
    uuid owner_id FK
    text blob_path
    text content_type
    timestamptz expires_at
  }
  deletion_requests {
    uuid id PK
    uuid user_id FK
    timestamptz scheduled_purge_at
    timestamptz cancelled_at
  }
```

---

## Table reference

### `users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `entra_oid` | TEXT | Unique Entra object id; dev bypass uses synthetic ids |
| `status` | TEXT | `active`, `deletion_pending`, `locked`, `purged` |
| `created_at` | TIMESTAMPTZ | Account creation |

### `profiles`

Discovery responses expose **fuzzed_distance_label** only — never raw coordinates. Server computes label from internal geo + `user_preferences.fuzzing_strategy`.

### `device_public_keys`

Only **public** JWK material. `revoked_at` set on key rotation or panic wipe sync.

### `messages`

MVP stores ciphertext in PostgreSQL. `expires_at` enables self-destruct; a scheduled job deletes expired rows.

Envelope fields match client [`crypto.js`](../src/utils/crypto.js) output: `ciphertext`, `iv`, `cipherSuite`, `keyId`.

### `media_objects`

`blob_path` references private container. `expires_at` aligns with Blob lifecycle policy (default 7 days dev, configurable prod).

### `deletion_requests`

30-day grace period. Worker consumes Service Bus message at `scheduled_purge_at`, deletes PG rows, blobs, and revokes keys.

---

## Cosmos DB (optional, `enable_cosmos = true`)

When enabled, new messages may be written to Cosmos instead of PostgreSQL.

| Field | Purpose |
|-------|---------|
| Partition key | `/conversationId` |
| `id` | Message UUID |
| `ttl` | Seconds until auto-delete (ephemeral messages) |

Migration from PostgreSQL to Cosmos is a Phase 6 optional task.

---

## Redis keys (optional, `enable_redis = true`)

| Key pattern | TTL | Purpose |
|-------------|-----|---------|
| `presence:{userId}` | 120s | Online / discoverable heartbeat |
| `ratelimit:{ip}` | 60s | API rate limiting |
| `session:{sessionId}` | configurable | Auth session cache |

---

## Indexing

| Table | Index | Reason |
|-------|-------|--------|
| `profiles` | `(discoverable)` partial where true | Nearby discovery |
| `messages` | `(conversation_id, sent_at DESC)` | Thread pagination |
| `device_public_keys` | `(user_id)` where `revoked_at IS NULL` | Active key lookup |
| `media_objects` | `(expires_at)` | TTL purge scans |

---

## Verification checklist

1. API responses contain fuzzed distance labels — no raw lat/long.
2. Database inspection shows no private keys or message plaintext.
3. Deletion worker removes PG rows, blobs, and keys for the user.
4. SignalR delivers envelopes only to authorised conversation members.
5. Panic wipe + server revoke prevents re-registration of old device keys.

See [BACKEND.md](BACKEND.md) for service map and [SECURITY.md](SECURITY.md) for operator visibility.
