/**
 * In-app Terms of Service and Privacy Policy (MVP beta).
 * Not legal advice — have counsel review before public launch in your jurisdiction.
 */

export const LEGAL_LAST_UPDATED = '2026-06-03';

export const LEGAL_DISCLAIMER =
  'This text describes how Aether works today. It is not legal advice. A qualified lawyer should review it before a full public launch.';

export const TERMS_SECTIONS = [
  {
    id: 'acceptance',
    title: '1. Agreement',
    paragraphs: [
      'By creating an account, signing in, or using Aether, you agree to these Terms of Service and our Privacy Policy.',
      'If you do not agree, do not use the service.',
    ],
  },
  {
    id: 'eligibility',
    title: '2. Who may use Aether',
    paragraphs: [
      'Aether is a social discovery service intended only for adults aged 18 or older.',
      'You must confirm your age before first use. We may suspend accounts that appear to belong to minors.',
    ],
  },
  {
    id: 'account',
    title: '3. Your account',
    paragraphs: [
      'You are responsible for keeping your sign-in credentials confidential and for activity on your account.',
      'Profile information you choose to publish (display name, bio, photos) is visible to other users according to your discovery and privacy settings.',
      'You may schedule account deletion from Settings; deletion is completed after any stated grace period.',
    ],
  },
  {
    id: 'conduct',
    title: '4. Acceptable use',
    paragraphs: [
      'You must not harass, threaten, stalk, impersonate, spam, or post illegal content.',
      'You must not attempt to access other users’ private keys, decrypt messages without authorisation, or probe our systems.',
      'We may remove content, restrict features, or suspend accounts that violate these rules or applicable law.',
    ],
  },
  {
    id: 'e2ee',
    title: '5. Encryption and your devices',
    paragraphs: [
      'Private messaging uses end-to-end encryption. Message plaintext is encrypted on your device before it is sent.',
      'Private keys stay on your device (browser storage). If you lose access to your device or clear browser data without a backup, we cannot recover your keys or read old messages for you.',
      'You are responsible for verifying contacts (e.g. sharing codes / fingerprints) before trusting a conversation.',
    ],
  },
  {
    id: 'location',
    title: '6. Location and discovery',
    paragraphs: [
      'Aether does not store precise GPS coordinates on our servers for discovery.',
      'Distances shown to other users are intentionally approximate (fuzzed bands or grid labels) to reduce location privacy risk.',
    ],
  },
  {
    id: 'safety',
    title: '7. Safety tools',
    paragraphs: [
      'You can block users, report users for moderation review, and use panic / stealth features to hide your profile and revoke keys.',
      'Reports and blocks are processed according to our moderation practices; we do not guarantee outcomes or response times.',
    ],
  },
  {
    id: 'termination',
    title: '8. Ending the service',
    paragraphs: [
      'You may stop using Aether at any time and delete your account from Settings.',
      'We may suspend or terminate access for breach of these terms, legal requirements, or operational reasons, with notice where practicable.',
    ],
  },
  {
    id: 'disclaimer',
    title: '9. Disclaimers',
    paragraphs: [
      'Aether is provided “as is” during the beta period without warranties of uninterrupted service, fitness for a particular purpose, or error-free operation.',
      'To the extent permitted by law, we are not liable for indirect or consequential damages arising from use of the service.',
    ],
  },
  {
    id: 'changes',
    title: '10. Changes',
    paragraphs: [
      'We may update these terms. The “Last updated” date at the top of this page will change when we do.',
      'Continued use after changes take effect constitutes acceptance of the revised terms.',
    ],
  },
  {
    id: 'contact',
    title: '11. Contact',
    paragraphs: [
      'Questions about these terms: use Settings → Diagnostics → Report a problem, or contact your platform operator using the support channel provided at signup.',
    ],
  },
];

export const PRIVACY_SECTIONS = [
  {
    id: 'intro',
    title: '1. Overview',
    paragraphs: [
      'This Privacy Policy explains what personal data Aether processes, why, and what choices you have.',
      'Aether is designed so that private message content is not readable by us without your device keys.',
    ],
  },
  {
    id: 'collect',
    title: '2. Data we process',
    paragraphs: [
      'Account data: email (for sign-in), display name, and authentication identifiers managed by our API.',
      'Profile data: bio, tags, avatar, discoverability settings, and fuzzed distance labels — not raw GPS on the server.',
      'Messaging metadata: conversation membership, ciphertext envelopes, timestamps, and optional read-receipt signals if you enable them.',
      'Cryptography: public keys registered for your devices; private keys remain on your device only.',
      'Safety records: block lists and user reports you submit.',
      'Media: album files you upload (metadata in our database; bytes in encrypted blob storage when configured).',
    ],
  },
  {
    id: 'not-collect',
    title: '3. What we do not do',
    paragraphs: [
      'We do not store message plaintext on our servers.',
      'We do not sell your personal data.',
      'Operational application logs sent to our hosting provider are sanitised to avoid personal identifiers (see section 7).',
    ],
  },
  {
    id: 'messages',
    title: '4. End-to-end encrypted messages',
    paragraphs: [
      'Messages are encrypted on your device before upload. We process ciphertext and routing metadata only.',
      'If you enable disappearing messages or media TTL features, content is deleted according to those settings and server purge jobs.',
    ],
  },
  {
    id: 'location',
    title: '5. Location',
    paragraphs: [
      'Discovery uses approximate distance bands or grid labels — not exact coordinates stored in PostgreSQL.',
      'You control discoverability (including stealth / panic) from Settings.',
    ],
  },
  {
    id: 'diagnostics',
    title: '6. Error reports (your choice)',
    paragraphs: [
      'Manual reports: you choose what to write in Settings → Diagnostics. Optional device context uses an allowlisted set of fields (browser, route path, theme) — not chat content.',
      'Automatic crash reports: off by default. If you turn on “Automatically send crash reports”, we may receive an error name and truncated stack snippet when you are signed in. You can turn this off at any time.',
      'Report content may be reviewed by operators to fix bugs. It is not used for advertising profiling.',
    ],
  },
  {
    id: 'logs',
    title: '7. Operational logs',
    paragraphs: [
      'Our API writes structured logs for security and reliability (e.g. request ID, HTTP method, sanitised route, status code).',
      'These logs are designed not to include email, user IDs, message bodies, or tokens. Retention follows our cloud log workspace policy (typically ~30 days).',
    ],
  },
  {
    id: 'rights',
    title: '8. Your rights',
    paragraphs: [
      'Depending on your region you may have rights to access, correct, delete, or export personal data.',
      'Account deletion and chat backup export are available in Settings today; contact us via Diagnostics if you need additional help.',
    ],
  },
  {
    id: 'retention',
    title: '9. Retention',
    paragraphs: [
      'Account and profile data are kept while your account is active and for any grace period after deletion is requested.',
      'Ciphertext and media may be purged on schedules configured for the service (TTL / account deletion workers).',
      'Error reports are kept until triaged and removed by operators unless law requires longer retention.',
    ],
  },
  {
    id: 'processors',
    title: '10. Service providers',
    paragraphs: [
      'When the live API is enabled, hosting may include Azure (e.g. Static Web Apps, Container Apps, PostgreSQL, Blob Storage, SignalR, Log Analytics) under their terms and security programmes.',
      'Password-reset and optional error-alert emails use SMTP you configure; message content in those emails is minimal.',
    ],
  },
  {
    id: 'children',
    title: '11. Children',
    paragraphs: [
      'Aether is not directed at anyone under 18. We do not knowingly collect data from minors.',
    ],
  },
  {
    id: 'changes',
    title: '12. Changes',
    paragraphs: [
      'We may update this policy. The “Last updated” date will change when we do.',
      'Material changes will be surfaced in the app where practicable.',
    ],
  },
  {
    id: 'contact',
    title: '13. Contact',
    paragraphs: [
      'Privacy questions: Settings → Diagnostics → Report a problem, or your operator’s published support contact.',
    ],
  },
];
