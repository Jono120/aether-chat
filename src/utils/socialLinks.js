export const SOCIAL_PLATFORMS = ['instagram', 'twitter', 'facebook', 'bluesky', 'discord'];

export const SOCIAL_PLATFORM_META = [
  { id: 'instagram', label: 'Instagram', placeholder: 'username' },
  { id: 'twitter', label: 'Twitter / X', placeholder: 'username' },
  { id: 'facebook', label: 'Facebook', placeholder: 'username or page' },
  { id: 'bluesky', label: 'Bluesky', placeholder: 'handle.bsky.social' },
  { id: 'discord', label: 'Discord', placeholder: 'username' },
];

const USERNAME_RE = /^[a-zA-Z0-9._-]{1,100}$/;

function extractFromUrl(input, platform) {
  const trimmed = input.trim();
  if (
    !trimmed.includes('/')
    && !/^https?:\/\//i.test(trimmed)
    && !/^(www\.)?(instagram|twitter|x|facebook|fb|bsky)\./i.test(trimmed)
  ) {
    return null;
  }

  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();
    const parts = url.pathname.split('/').filter(Boolean);

    switch (platform) {
      case 'instagram':
        if (host === 'instagram.com' || host.endsWith('.instagram.com')) return parts[0] ?? null;
        break;
      case 'twitter':
        if (host === 'twitter.com' || host === 'x.com' || host.endsWith('.twitter.com') || host.endsWith('.x.com')) {
          return parts[0] ?? null;
        }
        break;
      case 'facebook':
        if (host === 'facebook.com' || host === 'fb.com' || host.endsWith('.facebook.com')) {
          return parts[0] ?? null;
        }
        break;
      case 'bluesky':
        if (host === 'bsky.app' && parts[0] === 'profile' && parts[1]) return parts[1];
        break;
      default:
        break;
    }
  } catch {
    return null;
  }

  return null;
}

export function normalizeSocialUsername(raw, platform) {
  const fromUrl = extractFromUrl(raw, platform);
  const value = (fromUrl ?? raw).trim().replace(/^@+/, '');
  if (!value) return '';
  if (!USERNAME_RE.test(value)) return value;
  return value;
}

export function emptySocialLinksForm() {
  return Object.fromEntries(SOCIAL_PLATFORMS.map((p) => [p, '']));
}

export function socialLinksToForm(socialLinks) {
  const base = emptySocialLinksForm();
  if (!socialLinks || typeof socialLinks !== 'object') return base;
  for (const platform of SOCIAL_PLATFORMS) {
    if (typeof socialLinks[platform] === 'string') {
      base[platform] = socialLinks[platform];
    }
  }
  return base;
}

export function formToSocialLinks(formLinks) {
  if (!formLinks || typeof formLinks !== 'object') return {};
  const result = {};
  for (const platform of SOCIAL_PLATFORMS) {
    const raw = formLinks[platform];
    if (typeof raw !== 'string') continue;
    const normalized = normalizeSocialUsername(raw, platform);
    if (normalized) result[platform] = normalized;
  }
  return result;
}

export function socialProfileUrl(platform, username) {
  switch (platform) {
    case 'instagram':
      return `https://instagram.com/${encodeURIComponent(username)}`;
    case 'twitter':
      return `https://x.com/${encodeURIComponent(username)}`;
    case 'facebook':
      return `https://facebook.com/${encodeURIComponent(username)}`;
    case 'bluesky':
      return `https://bsky.app/profile/${encodeURIComponent(username)}`;
    case 'discord':
      return '';
    default:
      return '#';
  }
}

export function listSocialLinksForDisplay(socialLinks) {
  if (!socialLinks || typeof socialLinks !== 'object') return [];

  return SOCIAL_PLATFORM_META.flatMap((meta) => {
    const username = socialLinks[meta.id];
    if (typeof username !== 'string' || !username.trim()) return [];
    return [{
      platform: meta.id,
      label: meta.label,
      username,
      href: socialProfileUrl(meta.id, username),
    }];
  });
}
