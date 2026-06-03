import { pool } from '../db/pool.js';
import { logger } from '../utils/logger.js';
import { sendErrorReportAlert } from './email.js';

const MAX_DESCRIPTION = 4000;
const MAX_CONTEXT_BYTES = 16_000;
const MAX_STACK_SNIPPET = 2048;

const ALLOWED_CONTEXT_KEYS = new Set([
  'deviceId',
  'fingerprint',
  'userAgent',
  'urlPath',
  'theme',
  'accessibility',
  'apiEnabled',
  'appVersion',
  'buildTime',
]);

const SENSITIVE_KEY = /message|cipher|token|password|session/i;

export type ErrorReportSource = 'user' | 'auto';
export type ErrorReportStatus = 'new' | 'triaged' | 'resolved';

export function redactErrorContext(context: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(context ?? {})) {
    if (SENSITIVE_KEY.test(key)) continue;
    if (!ALLOWED_CONTEXT_KEYS.has(key)) continue;
    if (key === 'urlPath' && typeof value === 'string') {
      out.urlPath = value.split('?')[0]!.split('#')[0]!;
      continue;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = value;
    }
  }

  if (typeof context?.url === 'string' && !out.urlPath) {
    try {
      const parsed = new URL(context.url);
      out.urlPath = `${parsed.pathname}${parsed.hash}`;
    } catch {
      out.urlPath = String(context.url).split('?')[0]!.split('#')[0]!;
    }
  }

  return out;
}

function truncateStack(stack: string | null | undefined): string | null {
  if (!stack) return null;
  const trimmed = stack.trim();
  if (!trimmed) return null;
  return trimmed.length > MAX_STACK_SNIPPET ? trimmed.slice(0, MAX_STACK_SNIPPET) : trimmed;
}

export type SubmitErrorReportInput = {
  userId: string;
  description: string;
  context?: Record<string, unknown>;
  source?: ErrorReportSource;
  errorName?: string | null;
  stackSnippet?: string | null;
};

export async function submitErrorReport(
  input: SubmitErrorReportInput,
): Promise<{ id: string; createdAt: string; source: ErrorReportSource }> {
  const source: ErrorReportSource = input.source === 'auto' ? 'auto' : 'user';
  const trimmed = input.description.trim();

  if (source === 'user' && trimmed.length < 10) {
    throw new Error('Please describe the problem in at least 10 characters.');
  }
  if (source === 'auto' && trimmed.length < 1) {
    throw new Error('Automatic report requires a description.');
  }
  if (trimmed.length > MAX_DESCRIPTION) {
    throw new Error('Description is too long.');
  }

  const context = redactErrorContext(input.context ?? {});
  const contextJson = JSON.stringify(context);
  if (Buffer.byteLength(contextJson, 'utf8') > MAX_CONTEXT_BYTES) {
    throw new Error('Diagnostic context is too large.');
  }

  const errorName =
    typeof input.errorName === 'string' && input.errorName.trim()
      ? input.errorName.trim().slice(0, 200)
      : null;
  const stackSnippet = truncateStack(
    typeof input.stackSnippet === 'string' ? input.stackSnippet : null,
  );

  const result = await pool.query(
    `INSERT INTO error_reports (user_id, description, context, source, error_name, stack_snippet)
     VALUES ($1, $2, $3::jsonb, $4, $5, $6)
     RETURNING id, created_at, source`,
    [input.userId, trimmed, contextJson, source, errorName, stackSnippet],
  );

  const row = result.rows[0];
  const reportId = row.id as string;

  logger.info('Error report received', {
    reportId,
    source: row.source as ErrorReportSource,
    status: 'new',
  });

  const emailRow = await pool.query(
    `SELECT la.email
     FROM local_accounts la
     WHERE la.user_id = $1`,
    [input.userId],
  );
  const userEmail = (emailRow.rows[0]?.email as string | undefined) ?? '';

  void sendErrorReportAlert({
    reportId,
    source: row.source as ErrorReportSource,
    userEmail,
    descriptionPreview: trimmed.slice(0, 200),
  }).catch((err) => {
    logger.warn('Error report alert email failed', {
      reportId,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  return {
    id: reportId,
    createdAt: row.created_at.toISOString(),
    source: row.source as ErrorReportSource,
  };
}

export type ErrorReportRow = {
  id: string;
  userId: string | null;
  userEmail: string | null;
  source: ErrorReportSource;
  status: ErrorReportStatus;
  description: string;
  context: Record<string, unknown>;
  errorName: string | null;
  stackSnippet: string | null;
  createdAt: string;
};

function mapReportRow(row: Record<string, unknown>): ErrorReportRow {
  return {
    id: row.id as string,
    userId: (row.user_id as string | null) ?? null,
    userEmail: (row.user_email as string | null) ?? null,
    source: row.source as ErrorReportSource,
    status: row.status as ErrorReportStatus,
    description: row.description as string,
    context: (row.context as Record<string, unknown>) ?? {},
    errorName: (row.error_name as string | null) ?? null,
    stackSnippet: (row.stack_snippet as string | null) ?? null,
    createdAt: (row.created_at as Date).toISOString(),
  };
}

const REPORT_SELECT = `
  er.id,
  er.user_id,
  la.email AS user_email,
  er.source,
  er.status,
  er.description,
  er.context,
  er.error_name,
  er.stack_snippet,
  er.created_at
`;

export async function listErrorReports(options: {
  status?: ErrorReportStatus;
  source?: ErrorReportSource;
  since?: string;
  limit?: number;
  cursor?: string;
}): Promise<{ reports: ErrorReportRow[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (options.status) {
    conditions.push(`er.status = $${paramIndex++}`);
    params.push(options.status);
  }
  if (options.source) {
    conditions.push(`er.source = $${paramIndex++}`);
    params.push(options.source);
  }
  if (options.since) {
    conditions.push(`er.created_at >= $${paramIndex++}`);
    params.push(options.since);
  }
  if (options.cursor) {
    conditions.push(`(er.created_at, er.id) < ($${paramIndex++}::timestamptz, $${paramIndex++}::uuid)`);
    const [createdAt, id] = options.cursor.split('|');
    params.push(createdAt, id);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit + 1);

  const result = await pool.query(
    `SELECT ${REPORT_SELECT}
     FROM error_reports er
     LEFT JOIN local_accounts la ON la.user_id = er.user_id
     ${where}
     ORDER BY er.created_at DESC, er.id DESC
     LIMIT $${paramIndex}`,
    params,
  );

  const rows = result.rows;
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const reports = page.map((row) => mapReportRow(row));

  let nextCursor: string | null = null;
  if (hasMore && page.length > 0) {
    const last = page[page.length - 1]!;
    nextCursor = `${(last.created_at as Date).toISOString()}|${last.id}`;
  }

  return { reports, nextCursor };
}

export async function getErrorReportById(id: string): Promise<ErrorReportRow | null> {
  const result = await pool.query(
    `SELECT ${REPORT_SELECT}
     FROM error_reports er
     LEFT JOIN local_accounts la ON la.user_id = er.user_id
     WHERE er.id = $1`,
    [id],
  );
  if (!result.rows[0]) return null;
  return mapReportRow(result.rows[0]);
}

export async function updateErrorReportStatus(
  id: string,
  status: ErrorReportStatus,
): Promise<ErrorReportRow | null> {
  const result = await pool.query(
    `UPDATE error_reports
     SET status = $2
     WHERE id = $1
     RETURNING id`,
    [id, status],
  );
  if (!result.rows[0]) return null;
  return getErrorReportById(id);
}
