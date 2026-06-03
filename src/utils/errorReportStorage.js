import { isApiEnabled, submitErrorReport } from '../api/client';

const QUEUE_KEY = 'aether_pending_error_reports';

export function queueErrorReportLocally(entry) {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.push({ ...entry, queuedAt: new Date().toISOString() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(list.slice(-20)));
  } catch {
    /* ignore quota errors */
  }
}

export async function flushQueuedErrorReports() {
  if (!isApiEnabled()) return { flushed: 0 };
  const raw = localStorage.getItem(QUEUE_KEY);
  if (!raw) return { flushed: 0 };
  const list = JSON.parse(raw);
  if (!Array.isArray(list) || list.length === 0) return { flushed: 0 };

  const remaining = [];
  let flushed = 0;
  for (const entry of list) {
    try {
      await submitErrorReport({
        description: entry.description ?? '',
        context: entry.context ?? {},
        source: entry.source ?? 'user',
        errorName: entry.errorName,
        stackSnippet: entry.stackSnippet,
      });
      flushed += 1;
    } catch {
      remaining.push(entry);
    }
  }
  if (remaining.length) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  } else {
    localStorage.removeItem(QUEUE_KEY);
  }
  return { flushed };
}
