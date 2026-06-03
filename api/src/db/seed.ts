import { pool } from './pool.js';
import { ensureAdministratorAccount } from '../services/adminAccount.js';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed: NODE_ENV=production');
  process.exit(1);
}
if (process.env.ALLOW_SEED !== 'true') {
  console.error('Set ALLOW_SEED=true to run seed (never in production pipelines)');
  process.exit(1);
}

/** Demo peer public keys — keep in sync with src/utils/devPeerKeys.js */
const SEED_PEER_KEYS: Record<string, object> = {
  'seed-julian': {
    crv: 'X25519',
    kty: 'OKP',
    x: 'ey5yneYC8yUlPIjIcK-V602Xg6bCdEbWJUCirWPvkBw',
  },
  'seed-alex': {
    crv: 'X25519',
    kty: 'OKP',
    x: 'naEtOkmQFt8WnBH661A8Y_dQEXBm-dIRJ3AbHoBhETs',
  },
  'seed-marcus': {
    crv: 'X25519',
    kty: 'OKP',
    x: 'cWIzmTSAc0utHkmcTuorI4N3vuRE8n8_Fle7J-MDz1Y',
  },
};

const SEED_PROFILES = [
  {
    entra_oid: 'seed-julian',
    display_name: 'Julian',
    age: 25,
    gender: 'male',
    role_label: 'Looking for coffee & chats',
    bio: 'Enjoys cycling, web design, and digital privacy.',
    fuzzed_distance_label: 'Nearby (< 500m)',
    avatar_colors: { primary: '#7c3aed', secondary: '#db2777' },
    tags: ['Privacy First', 'Coffee', 'Cycling', 'Tech'],
    looking_for: ['Coffee', 'Chats', 'Friends'],
    has_secure_album: true,
  },
  {
    entra_oid: 'seed-alex',
    display_name: 'Alex',
    age: 28,
    gender: 'non-binary',
    role_label: 'New in the city',
    bio: 'Cybersecurity analyst by day.',
    fuzzed_distance_label: 'Within 2 km',
    avatar_colors: { primary: '#0891b2', secondary: '#0d9488' },
    tags: ['Cybersec', 'Foodie'],
    looking_for: ['Friends', 'Coffee', 'Events'],
    has_secure_album: true,
  },
  {
    entra_oid: 'seed-marcus',
    display_name: 'Marcus',
    age: 31,
    gender: 'male',
    role_label: 'Gym & Outdoors',
    bio: 'Always active.',
    fuzzed_distance_label: 'Within 3 km',
    avatar_colors: { primary: '#2563eb', secondary: '#7c3aed' },
    tags: ['Fitness', 'Hiking'],
    looking_for: ['Workout buddy', 'Friends'],
    has_secure_album: false,
  },
];

async function seed() {
  await ensureAdministratorAccount();
  console.log('Administrator account ready (admin@aether.local)');

  for (const p of SEED_PROFILES) {
    const user = await pool.query(
      `INSERT INTO users (entra_oid) VALUES ($1)
       ON CONFLICT (entra_oid) DO UPDATE SET entra_oid = EXCLUDED.entra_oid
       RETURNING id`,
      [p.entra_oid],
    );
    const userId = user.rows[0].id;
    await pool.query(
      `INSERT INTO profiles (user_id, display_name, bio, role_label, age, gender, fuzzed_distance_label, avatar_colors, tags, looking_for, has_secure_album)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (user_id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         fuzzed_distance_label = EXCLUDED.fuzzed_distance_label`,
      [
        userId,
        p.display_name,
        p.bio,
        p.role_label,
        p.age,
        p.gender,
        p.fuzzed_distance_label,
        JSON.stringify(p.avatar_colors),
        JSON.stringify(p.tags),
        JSON.stringify(p.looking_for),
        p.has_secure_album,
      ],
    );
    await pool.query(
      `INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
      [userId],
    );

    const peerJwk = SEED_PEER_KEYS[p.entra_oid];
    if (peerJwk) {
      const deviceId = `seed-device-${p.entra_oid}`;
      const fingerprint = `SEED:${p.entra_oid}`;
      await pool.query(
        `INSERT INTO device_public_keys (user_id, device_id, public_key_jwk, fingerprint)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, device_id) DO UPDATE SET
           public_key_jwk = EXCLUDED.public_key_jwk,
           fingerprint = EXCLUDED.fingerprint,
           revoked_at = NULL`,
        [userId, deviceId, JSON.stringify(peerJwk), fingerprint],
      );
    }
  }
  console.log('Seed complete');
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
