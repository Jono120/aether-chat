export const SOCIAL_PLATFORMS = ['instagram', 'twitter', 'facebook', 'bluesky', 'discord'] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export type SocialLinks = Partial<Record<SocialPlatform, string>>;

const USERNAME_RE = /^[a-zA-Z0-9._-]{1,100}$/;

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  twitter: 'Twitter / X',
  facebook: 'Facebook',
  bluesky: 'Bluesky',
  discord: 'Discord',
};

function extractFromUrl(input: string, platform: SocialPlatform): string | null {
  const trimmed = input.trim();
  if (!trimmed.includes('/') && !/^https?:\/\//i.test(trimmed) && !/^(www\.)?(instagram|twitter|x|facebook|fb|bsky)\./i.test(trimmed)) {
    return null;
  }

  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();
    const parts = url.pathname.split('/').filter(Boolean);

    switch (platform) {
      case 'instagram':
        if (host === 'instagram.com' || host.endsWith('.instagram.com')) {
          return parts[0] ?? null;
        }
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
        if (host === 'bsky.app' && parts[0] === 'profile' && parts[1]) {
          return parts[1];
        }
        break;
      default:
        break;
    }
  } catch {
    return null;
  }

  return null;
}

export function normalizeSocialUsername(raw: string, platform: SocialPlatform): string | null {
  const fromUrl = extractFromUrl(raw, platform);
  let value = (fromUrl ?? raw).trim().replace(/^@+/, '');
  if (!value) return null;
  if (!USERNAME_RE.test(value)) {
    throw new Error(`Invalid ${PLATFORM_LABELS[platform]} username`);
  }
  return value;
}

export function normalizeSocialLinks(input: unknown): SocialLinks {
  if (input === undefined || input === null) return {};
  if (typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Invalid social links');
  }

  const obj = input as Record<string, unknown>;
  const result: SocialLinks = {};

  for (const platform of SOCIAL_PLATFORMS) {
    if (!(platform in obj)) continue;
    const raw = obj[platform];
    if (raw === null || raw === undefined || raw === '') continue;
    if (typeof raw !== 'string') throw new Error('Invalid social links');
    const normalized = normalizeSocialUsername(raw, platform);
    if (normalized) result[platform] = normalized;
  }

  return result;
}

export function socialProfileUrl(platform: SocialPlatform, username: string): string {
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

export function parseStoredSocialLinks(raw: unknown): SocialLinks {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result: SocialLinks = {};
  for (const platform of SOCIAL_PLATFORMS) {
    const value = (raw as Record<string, unknown>)[platform];
    if (typeof value === 'string' && value.trim()) {
      result[platform] = value.trim();
    }
  }
  return result;
}
