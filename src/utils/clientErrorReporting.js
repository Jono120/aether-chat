import { isApiEnabled, submitErrorReport } from '../api/client';
import { loadSession } from './authStorage';
import { queueErrorReportLocally } from './errorReportStorage';

const AUTO_REPORT_KEY = 'aether_auto_error_report';
const DEDUPE_MS = 5 * 60 * 1000;
const MAX_MESSAGE = 500;
const MAX_STACK = 1024;

const recentReports = new Map();

export function isAutoErrorReportEnabled() {
  try {
    return localStorage.getItem(AUTO_REPORT_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAutoErrorReportEnabled(enabled) {
  try {
    localStorage.setItem(AUTO_REPORT_KEY, enabled ? 'true' : 'false');
  } catch {
    /* ignore */
  }
}

function hashKey(errorName, message) {
  return `${errorName ?? ''}|${(message ?? '').slice(0, 120)}`;
}

function shouldDedupe(key) {
  const now = Date.now();
  const last = recentReports.get(key);
  if (last && now - last < DEDUPE_MS) return true;
  recentReports.set(key, now);
  if (recentReports.size > 50) {
    for (const [k, t] of recentReports) {
      if (now - t > DEDUPE_MS) recentReports.delete(k);
    }
  }
  return false;
}

function truncate(text, max) {
  if (!text) return '';
  const s = String(text);
  return s.length > max ? s.slice(0, max) : s;
}

export function buildErrorReportContext(extra = {}) {
  const { pathname, hash } = window.location;
  return {
    urlPath: `${pathname}${hash}`,
    userAgent: navigator.userAgent,
    apiEnabled: isApiEnabled(),
    theme: document.documentElement.getAttribute('data-a11y-theme') ?? 'dark',
    ...extra,
  };
}

function canAutoReport() {
  if (!isAutoErrorReportEnabled()) return false;
  if (!isApiEnabled()) return false;
  const session = loadSession();
  return Boolean(session?.token);
}

export async function reportClientError(error, info = {}, kind = 'unknown') {
  if (!canAutoReport()) return;

  const errorName = error?.name ?? 'Error';
  const message = truncate(error?.message ?? String(error), MAX_MESSAGE);
  const dedupeKey = hashKey(errorName, message);
  if (shouldDedupe(dedupeKey)) return;

  const componentStack = truncate(info?.componentStack ?? '', MAX_STACK);
  const stackSnippet = truncate(error?.stack ?? componentStack, MAX_STACK);
  const description = `${errorName}: ${message}`.trim() || `Automatic crash report (${kind})`;
  const context = buildErrorReportContext();

  const payload = {
    description,
    context,
    source: 'auto',
    errorName,
    stackSnippet: stackSnippet || componentStack || undefined,
  };

  try {
    await submitErrorReport(payload);
  } catch {
    queueErrorReportLocally(payload);
  }
}
