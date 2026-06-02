# Aether API

Node.js / TypeScript REST API for profiles, public keys, ciphertext messages, media SAS, and account lifecycle.

## Quick start

```bash
docker run -d --name aether-pg \
  -e POSTGRES_USER=aetheradmin \
  -e POSTGRES_PASSWORD=aether \
  -e POSTGRES_DB=aether \
  -p 5432:5432 postgres:16

cp .env.example .env
npm install
npm run migrate
npm run seed
npm run dev
```

Set `DEV_AUTH_BYPASS=true` and send `X-Dev-User-Id: dev-user-1` from the SPA (`VITE_DEV_USER_ID`).

## Workers

```bash
npx tsx workers/purge/index.ts
```

Processes Service Bus deletion messages and expired media/message TTL when configured.

## Docker

```bash
docker build -t aether-api .
docker run -p 8080:8080 -e DATABASE_URL=... aether-api
```

See [docs/BACKEND.md](../docs/BACKEND.md) for the full service map.
