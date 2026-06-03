const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const UUID_PATTERN =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const IPV4_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const BEARER_PATTERN = /bearer\s+[a-zA-Z0-9._-]+/gi;
const SENSITIVE_KEY = /email|password|token|secret|authorization|cookie|session|cipher|message|stack|description|body|useragent|user_agent|fingerprint|deviceid|device_id/i;

const REDACTED_KEYS = new Set([
  'userid',
  'user_id',
  'useremail',
  'user_email',
  'to',
  'from',
  'sub',
  'entraoid',
  'entra_oid',
]);

const MAX_DEPTH = 4;
const MAX_STRING = 500;

export function sanitizeLogPath(path: string): string {
  const withoutQuery = path.split('?')[0]!.split('#')[0]!;
  return withoutQuery
    .replace(UUID_PATTERN, ':id')
    .replace(/\/\d+(?=\/|$)/g, '/:id');
}

function redactString(value: string): string {
  let s = value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  s = s.replace(EMAIL_PATTERN, '[redacted-email]');
  s = s.replace(BEARER_PATTERN, 'Bearer [redacted]');
  s = s.replace(UUID_PATTERN, '[redacted-id]');
  s = s.replace(IPV4_PATTERN, '[redacted-ip]');
  return s;
}

function sanitizeValue(key: string, value: unknown, depth: number): unknown {
  const keyLower = key.toLowerCase();

  if (REDACTED_KEYS.has(keyLower) || SENSITIVE_KEY.test(key)) {
    return '[redacted]';
  }

  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    if (keyLower === 'path' || keyLower === 'urlpath' || keyLower === 'route') {
      return sanitizeLogPath(value);
    }
    return redactString(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (depth >= MAX_DEPTH) return '[truncated]';

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue('', item, depth + 1));
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeValue(k, v, depth + 1);
    }
    return out;
  }

  return '[redacted]';
}

export function sanitizeLogMeta(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    out[key] = sanitizeValue(key, value, 0);
  }
  return out;
}
