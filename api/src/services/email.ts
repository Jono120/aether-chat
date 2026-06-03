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

  const body = [
    'A new Aether error report was submitted.',
    '',
    `Report ID: ${options.reportId}`,
    `Time: ${new Date().toISOString()}`,
    `Source: ${options.source}`,
    `User email: ${options.userEmail || '(unknown)'}`,
    '',
    'Description preview:',
    options.descriptionPreview,
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
