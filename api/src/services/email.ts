import { config } from '../config.js';
import { logger } from '../utils/logger.js';

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  if (!config.smtpHost) {
    logger.warn('SMTP not configured; password reset email skipped');
    return false;
  }

  const body = [
    'You requested a password reset for Aether.',
    '',
    `Reset your password: ${resetUrl}`,
    '',
    'This link expires in one hour. If you did not request this, ignore this email.',
  ].join('\n');

  try {
    const nodemailer = await import('nodemailer').then((m) => m.default ?? m);
    const transport = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: config.smtpUser ? { user: config.smtpUser, pass: config.smtpPass } : undefined,
    });
    await transport.sendMail({
      from: config.smtpFrom,
      to,
      subject: 'Reset your Aether password',
      text: body,
    });
    return true;
  } catch (err) {
    logger.error('Password reset email failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<boolean> {
  if (!config.smtpHost) {
    logger.warn('SMTP not configured; verification email skipped');
    return false;
  }

  const body = [
    'Welcome to Aether! Please confirm your email address.',
    '',
    `Verify your email: ${verifyUrl}`,
    '',
    'This link expires in 24 hours. If you did not create an Aether account, ignore this email.',
  ].join('\n');

  try {
    const nodemailer = await import('nodemailer').then((m) => m.default ?? m);
    const transport = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: config.smtpUser ? { user: config.smtpUser, pass: config.smtpPass } : undefined,
    });
    await transport.sendMail({
      from: config.smtpFrom,
      to,
      subject: 'Verify your Aether email',
      text: body,
    });
    return true;
  } catch (err) {
    logger.error('Verification email failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/** Masks an email for operator alerts: keeps first character and domain only. */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '(unknown)';
  return `${local[0]}***@${domain}`;
}

const ALERT_PREVIEW_MAX = 120;

export async function sendErrorReportAlert(options: {
  reportId: string;
  source: string;
  userEmail: string;
  descriptionPreview: string;
}): Promise<boolean> {
  const to = config.supportAlertEmail;
  if (!to) {
    logger.warn('Support alert skipped — SUPPORT_ALERT_EMAIL not configured');
    return false;
  }
  if (!config.smtpHost) {
    logger.warn('Support alert skipped — SMTP not configured');
    return false;
  }

  // Keep PII out of operator inboxes: masked email, truncated free-text preview.
  // Full report content stays in PostgreSQL behind the admin API.
  const preview =
    options.descriptionPreview.length > ALERT_PREVIEW_MAX
      ? `${options.descriptionPreview.slice(0, ALERT_PREVIEW_MAX)}…`
      : options.descriptionPreview;

  const body = [
    'A new Aether error report was submitted.',
    '',
    `Report ID: ${options.reportId}`,
    `Time: ${new Date().toISOString()}`,
    `Source: ${options.source}`,
    `User email: ${options.userEmail ? maskEmail(options.userEmail) : '(unknown)'}`,
    '',
    'Description preview:',
    preview,
    '',
    'Triage via GET /api/v1/admin/error-reports (admin JWT required).',
  ].join('\n');

  try {
    const nodemailer = await import('nodemailer').then((m) => m.default ?? m);
    const transport = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      auth: config.smtpUser ? { user: config.smtpUser, pass: config.smtpPass } : undefined,
    });
    await transport.sendMail({
      from: config.smtpFrom,
      to,
      subject: `[Aether] New error report (${options.source})`,
      text: body,
    });
    return true;
  } catch (err) {
    logger.error('Error report alert email failed', {
      reportId: options.reportId,
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
