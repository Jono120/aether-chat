const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const UUID_PATTERN =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;

function redactString(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(EMAIL_PATTERN, '[redacted-email]')
    .replace(UUID_PATTERN, '[redacted-id]')
    .slice(0, 300);
}

function safeErrorSummary(error) {
  if (!error) return { name: 'Error', message: 'Unknown error' };
  return {
    name: error.name ?? 'Error',
    message: redactString(String(error.message ?? error)),
  };
}

/** Browser console helper — never logs stacks, tokens, or full error objects in production builds. */
export function logClientError(label, error, extra) {
  const summary = safeErrorSummary(error);
  if (import.meta.env.DEV) {
    console.error(label, summary, extra ?? '');
  } else {
    console.error(label, summary);
  }
}
