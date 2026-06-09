import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const {
  LEGAL_DISCLAIMER,
  LEGAL_LAST_UPDATED,
  PRIVACY_SECTIONS,
  TERMS_SECTIONS,
} = await import('../src/content/legal.js');

const payload = {
  lastUpdated: LEGAL_LAST_UPDATED,
  disclaimer: LEGAL_DISCLAIMER,
  termsSections: TERMS_SECTIONS,
  privacySections: PRIVACY_SECTIONS,
};

const outDir = path.join(__dirname, '../src/i18n/locales');
fs.writeFileSync(path.join(outDir, 'legal.en-NZ.json'), `${JSON.stringify(payload, null, 2)}\n`);
console.log('Wrote legal.en-NZ.json');
