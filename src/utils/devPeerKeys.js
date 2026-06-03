/**
 * Deterministic demo public keys for local 1:1 E2EE when peers have not registered keys.
 * Keep in sync with api/src/db/seed.ts SEED_PEER_KEYS.
 */
const DEV_PEER_PUBLIC_JWKS = {
  julian: {
    crv: 'X25519',
    kty: 'OKP',
    x: 'ey5yneYC8yUlPIjIcK-V602Xg6bCdEbWJUCirWPvkBw',
  },
  alex: {
    crv: 'X25519',
    kty: 'OKP',
    x: 'naEtOkmQFt8WnBH661A8Y_dQEXBm-dIRJ3AbHoBhETs',
  },
  marcus: {
    crv: 'X25519',
    kty: 'OKP',
    x: 'cWIzmTSAc0utHkmcTuorI4N3vuRE8n8_Fle7J-MDz1Y',
  },
};

const MOCK_TO_SEED = {
  julian: 'seed-julian',
  alex: 'seed-alex',
  marcus: 'seed-marcus',
};

for (const [mockId, seedId] of Object.entries(MOCK_TO_SEED)) {
  DEV_PEER_PUBLIC_JWKS[seedId] = DEV_PEER_PUBLIC_JWKS[mockId];
}

export function resolvePeerApiId(profileId) {
  return MOCK_TO_SEED[profileId] ?? profileId;
}

export function getDevPeerPublicJwk(peerId) {
  return DEV_PEER_PUBLIC_JWKS[peerId] ?? null;
}

/** Shape expected by resolvePeerPublicJwk */
export function devPeerKeysFor(profileId) {
  const publicKeyJwk = getDevPeerPublicJwk(profileId);
  if (!publicKeyJwk) return [];
  return [
    {
      device_id: 'dev-peer-device',
      public_key_jwk: publicKeyJwk,
      fingerprint: 'DEV-PEER',
    },
  ];
}
