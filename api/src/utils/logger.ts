import { sanitizeLogMeta } from './logSanitize.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function write(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const entry = {
    time: new Date().toISOString(),
    level,
    msg: message,
    ...sanitizeLogMeta(meta),
  };
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => write('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => write('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write('error', message, meta),
};
