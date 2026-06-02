import { pool } from './pool.js';

const SEED_PROFILES = [
  {
    entra_oid: 'seed-julian',
    display_name: 'Julian',
    age: 25,
    role_label: 'Looking for coffee & chats',
    bio: 'Enjoys cycling, web design, and digital privacy.',
    fuzzed_distance_label: 'Nearby (< 500m)',
    avatar_colors: { primary: '#7c3aed', secondary: '#db2777' },
    tags: ['Privacy First', 'Coffee', 'Cycling', 'Tech'],
    has_secure_album: true,
  },
  {
    entra_oid: 'seed-alex',
    display_name: 'Alex',
    age: 28,
    role_label: 'New in the city',
    bio: 'Cybersecurity analyst by day.',
    fuzzed_distance_label: 'Within 2 km',
    avatar_colors: { primary: '#0891b2', secondary: '#0d9488' },
    tags: ['Cybersec', 'Foodie'],
    has_secure_album: true,
  },
  {
    entra_oid: 'seed-marcus',
    display_name: 'Marcus',
    age: 31,
    role_label: 'Gym & Outdoors',
    bio: 'Always active.',
    fuzzed_distance_label: 'Within 3 km',
    avatar_colors: { primary: '#2563eb', secondary: '#7c3aed' },
    tags: ['Fitness', 'Hiking'],
    has_secure_album: false,
  },
];

async function seed() {
  for (const p of SEED_PROFILES) {
    const user = await pool.query(
      `INSERT INTO users (entra_oid) VALUES ($1)
       ON CONFLICT (entra_oid) DO UPDATE SET entra_oid = EXCLUDED.entra_oid
       RETURNING id`,
      [p.entra_oid],
    );
    const userId = user.rows[0].id;
    await pool.query(
      `INSERT INTO profiles (user_id, display_name, bio, role_label, age, fuzzed_distance_label, avatar_colors, tags, has_secure_album)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         fuzzed_distance_label = EXCLUDED.fuzzed_distance_label`,
      [
        userId,
        p.display_name,
        p.bio,
        p.role_label,
        p.age,
        p.fuzzed_distance_label,
        JSON.stringify(p.avatar_colors),
        JSON.stringify(p.tags),
        p.has_secure_album,
      ],
    );
    await pool.query(
      `INSERT INTO user_preferences (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
      [userId],
    );
  }
  console.log('Seed complete');
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
