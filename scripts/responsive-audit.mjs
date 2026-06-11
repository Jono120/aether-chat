/**
 * Responsive scaling audit — mobile → desktop.
 * Run: node scripts/responsive-audit.mjs
 * Requires dev server at BASE_URL (default http://localhost:5173).
 */
import { chromium } from 'playwright';

const BASE_URL = process.env.AUDIT_URL || 'http://localhost:5173';

const VIEWPORTS = [
  { name: 'iPhone SE', width: 320, height: 568 },
  { name: 'iPhone 14', width: 390, height: 844 },
  { name: 'Android narrow', width: 360, height: 740 },
  { name: 'Large phone', width: 480, height: 854 },
  { name: 'Small tablet', width: 640, height: 960 },
  { name: 'Tablet portrait', width: 768, height: 1024 },
  { name: 'Tablet landscape', width: 900, height: 600 },
  { name: 'Laptop', width: 1024, height: 768 },
  { name: 'Desktop', width: 1200, height: 800 },
  { name: 'Wide desktop', width: 1440, height: 900 },
];

const TABS = [
  { id: 'grid', label: 'Discovery Grid', selectors: ['.discovery-grid', '.aether-header'] },
  { id: 'chat', label: 'Messages', selectors: ['.chat-layout', '.bottom-nav'] },
  { id: 'profile', label: 'Profile', selectors: ['.profile-page', '.profile-form'] },
  { id: 'privacy', label: 'Settings', selectors: ['.settings-layout', '.settings-nav'] },
];

const OFFLINE_SESSION = {
  token: null,
  user: {
    id: 'local-audit-user',
    email: 'audit@aether.local',
    displayName: 'Audit User',
    isAdmin: false,
  },
};

const CSS_BREAKPOINTS = [480, 540, 560, 640, 768, 900, 1024, 1200];

async function seedSession(page) {
  await page.addInitScript((session) => {
    localStorage.setItem('aether_session', JSON.stringify(session));
    // Dismiss the 18+ age gate so the audit can reach the app shell.
    localStorage.setItem('aether_age_confirmed', 'true');
  }, OFFLINE_SESSION);
}

async function measureOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const hOverflow = doc.scrollWidth - doc.clientWidth;
    const offenders = [];
    const selectors = [
      '.aether-header',
      '.header-container',
      '.header-controls',
      '.chat-header',
      '.chat-header-actions',
      '.settings-row',
      '.discovery-grid',
      '.chat-layout',
      '.bottom-nav',
      '.auth-page',
      '.profile-form',
      '.modal-content',
    ];
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.right > window.innerWidth + 1 || r.left < -1) {
          offenders.push({
            selector: sel,
            className: el.className?.toString?.().slice(0, 80) || '',
            right: Math.round(r.right),
            left: Math.round(r.left),
            width: Math.round(r.width),
            viewport: window.innerWidth,
          });
        }
      });
    }
    const smallTargets = [];
    document.querySelectorAll('button, a, .nav-link, .contact-btn').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.width < 44 || r.height < 44) {
        const visible =
          r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
        if (visible) {
          smallTargets.push({
            tag: el.tagName,
            className: (el.className || '').toString().slice(0, 60),
            w: Math.round(r.width),
            h: Math.round(r.height),
          });
        }
      }
    });
    return {
      horizontalOverflowPx: Math.max(0, hOverflow),
      offenders: offenders.slice(0, 12),
      smallTouchTargets: smallTargets.slice(0, 8),
    };
  });
}

function styleOf(sel) {
  const el = document.querySelector(sel);
  return el ? getComputedStyle(el) : null;
}

async function getLayoutSignals(page) {
  return page.evaluate(() => {
    const vis = (sel) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el).display !== 'none' : false;
    };
    const grid = document.querySelector('.discovery-grid');
    const chat = document.querySelector('.chat-layout');
    const settingsNav = document.querySelector('.settings-nav');
    const main = document.querySelector('.main-content');
    return {
      bottomNavVisible: vis('.bottom-nav'),
      headerNavTabsVisible: vis('.nav-tabs'),
      mobileMenuVisible: vis('.mobile-menu-btn'),
      chatSidebarVisible: vis('.chat-sidebar'),
      gridColumns: grid ? getComputedStyle(grid).gridTemplateColumns : 'n/a',
      chatLayoutCols: chat ? getComputedStyle(chat).gridTemplateColumns : 'n/a',
      settingsNavDirection: settingsNav ? getComputedStyle(settingsNav).flexDirection : 'n/a',
      mainPaddingBottom: main ? getComputedStyle(main).paddingBottom : 'n/a',
    };
  });
}

const TAB_NAV_LABELS = {
  grid: { desktop: 'Discovery Grid', mobile: 'Grid' },
  chat: { desktop: 'Messages', mobile: 'Chat' },
  profile: { desktop: 'Profile', mobile: 'Profile' },
  privacy: { desktop: 'Settings', mobile: 'Settings' },
};

async function switchTab(page, tabId) {
  const width = (await page.viewportSize()).width;
  const labels = TAB_NAV_LABELS[tabId];
  if (width >= 768) {
    await page.getByRole('button', { name: labels.desktop, exact: true }).click();
  } else {
    await page.locator('.bottom-nav .nav-link').filter({ hasText: labels.mobile }).click();
  }
  await page.waitForTimeout(400);
}

async function run() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (e) {
    console.error('Playwright chromium not available. Run: npx playwright install chromium');
    process.exit(1);
  }

  const page = await browser.newPage();
  const issues = [];
  const transitionLog = [];

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await seedSession(page);
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 15000 }).catch(() =>
      page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 }),
    );

    const onAuth = await page.locator('.auth-page').isVisible().catch(() => false);
    if (onAuth) {
      issues.push({
        severity: 'blocker',
        viewport: vp.name,
        width: vp.width,
        tab: 'app',
        message: 'Still on auth page — offline session not applied',
      });
      continue;
    }

    for (const tab of TABS) {
      try {
        await switchTab(page, tab.id);
      } catch {
        issues.push({ severity: 'warn', viewport: vp.name, width: vp.width, tab: tab.id, message: 'Tab switch failed' });
        continue;
      }

      const overflow = await measureOverflow(page);
      const layout = await getLayoutSignals(page);

      if (overflow.horizontalOverflowPx > 2) {
        issues.push({
          severity: 'high',
          viewport: vp.name,
          width: vp.width,
          tab: tab.id,
          message: `Horizontal page overflow ${overflow.horizontalOverflowPx}px`,
          offenders: overflow.offenders,
        });
      }
      if (overflow.offenders.length) {
        issues.push({
          severity: 'medium',
          viewport: vp.name,
          width: vp.width,
          tab: tab.id,
          message: 'Elements extend past viewport',
          offenders: overflow.offenders,
        });
      }
      if (overflow.smallTouchTargets.length >= 4) {
        issues.push({
          severity: 'low',
          viewport: vp.name,
          width: vp.width,
          tab: tab.id,
          message: `${overflow.smallTouchTargets.length}+ controls under 44×44px`,
          samples: overflow.smallTouchTargets,
        });
      }

      transitionLog.push({
        viewport: `${vp.name} (${vp.width}px)`,
        tab: tab.id,
        ...layout,
      });

      if (tab.id === 'chat' && vp.width < 768 && layout.chatSidebarVisible) {
        issues.push({
          severity: 'medium',
          viewport: vp.name,
          width: vp.width,
          tab: 'chat',
          message: 'Chat sidebar visible below 768px — may crowd mobile pane',
        });
      }
      if (tab.id === 'grid' && vp.width >= 768 && layout.bottomNavVisible) {
        issues.push({
          severity: 'medium',
          viewport: vp.name,
          width: vp.width,
          tab: 'grid',
          message: 'Bottom nav still visible at ≥768px',
        });
      }
    }
  }

  await browser.close();

  const deduped = [];
  const seen = new Set();
  for (const i of issues) {
    const key = `${i.severity}|${i.width}|${i.tab}|${i.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(i);
  }

  console.log('\n=== Aether Responsive Scaling Audit ===\n');
  console.log(`URL: ${BASE_URL}`);
  console.log(`CSS breakpoints in index.css: ${CSS_BREAKPOINTS.join(', ')}px\n`);

  console.log('--- Layout mode transitions (sample) ---');
  const keyWidths = [390, 767, 768, 1023, 1024];
  for (const w of keyWidths) {
    const row = transitionLog.find((r) => r.viewport.includes(`${w}px`) && r.tab === 'chat');
    if (row) console.log(JSON.stringify(row, null, 0));
  }

  console.log('\n--- Issues by severity ---');
  const order = ['blocker', 'high', 'medium', 'low'];
  for (const sev of order) {
    const group = deduped.filter((i) => i.severity === sev);
    if (!group.length) continue;
    console.log(`\n[${sev.toUpperCase()}] (${group.length})`);
    for (const i of group) {
      console.log(`  ${i.width}px / ${i.tab}: ${i.message}`);
      if (i.offenders?.length) console.log(`    → ${JSON.stringify(i.offenders[0])}`);
      if (i.samples?.length) console.log(`    → e.g. ${JSON.stringify(i.samples[0])}`);
    }
  }

  if (!deduped.length) console.log('No automated layout issues detected.');

  console.log('\n--- Transition points needing design review ---');
  const transitions = [
    { at: '320–479px', area: 'Discovery grid', note: '2 columns; album 1-col; header cram (no badge/status until 640px)' },
    { at: '480px', area: 'Discovery + album', note: 'Grid gap increases; album 2 columns' },
    { at: '560px', area: 'Profile fields', note: 'About fields 2-column grid' },
    { at: '640px', area: 'Header + discovery', note: 'Logo badge + status badge appear; grid → 3 columns' },
    { at: '768px', area: 'Primary shell', note: 'Bottom nav → header tabs; chat sidebar split; settings side nav; privacy 2-col' },
    { at: '900px', area: 'Header', note: 'User label visible' },
    { at: '1024px', area: 'Chat + grid', note: 'Wire inspector side-by-side; discovery 4 columns' },
    { at: '1200px', area: 'Content cap', note: 'main-content max-width 1200px; discovery 5 columns' },
  ];
  for (const t of transitions) {
    console.log(`  • ${t.at}: ${t.area} — ${t.note}`);
  }

  process.exit(deduped.some((i) => i.severity === 'blocker' || i.severity === 'high') ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
