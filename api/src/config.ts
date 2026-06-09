import 'dotenv/config';

const isProduction = process.env.NODE_ENV === 'production';

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction,
  port: Number(process.env.PORT ?? 8080),
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://aetheradmin:aether@localhost:5432/aether',
  devAuthBypass:
    !isProduction && process.env.DEV_AUTH_BYPASS !== 'false' && process.env.DEV_AUTH_BYPASS === 'true',
  workerPurgeOnly: process.env.WORKER_PURGE_ONLY === 'true',
  jwtSecret: process.env.JWT_SECRET ?? 'aether-dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  adminEmail: process.env.ADMIN_EMAIL ?? 'admin@aether.local',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'ChangeMe-Admin-2026!',
  adminEntraOid: process.env.ADMIN_ENTRA_OID ?? 'local:administrator',
  adminDisplayName: process.env.ADMIN_DISPLAY_NAME ?? 'Administrator',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  appleClientId: process.env.APPLE_CLIENT_ID ?? '',
  appleRedirectUri: process.env.APPLE_REDIRECT_URI ?? '',
  azureAdTenantId: process.env.AZURE_AD_TENANT_ID ?? '',
  azureAdClientId: process.env.AZURE_AD_CLIENT_ID ?? '',
  storageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING ?? '',
  signalrConnectionString: process.env.AZURE_SIGNALR_CONNECTION_STRING ?? '',
  serviceBusConnectionString: process.env.SERVICE_BUS_CONNECTION_STRING ?? '',
  serviceBusDeletionQueue: process.env.SERVICE_BUS_DELETION_QUEUE ?? 'account-deletion',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  redisUrl: process.env.REDIS_URL ?? '',
  mediaContainer: process.env.MEDIA_CONTAINER ?? 'media',
  mediaSasMinutes: Number(process.env.MEDIA_SAS_MINUTES ?? 15),
  mediaDefaultTtlDays: Number(process.env.MEDIA_DEFAULT_TTL_DAYS ?? 7),
  appPublicUrl: process.env.APP_PUBLIC_URL ?? 'http://localhost:5173',
  iosAppStoreUrl: process.env.IOS_APP_STORE_URL ?? '',
  androidPlayStoreUrl: process.env.ANDROID_PLAY_STORE_URL ?? '',
  smtpHost: process.env.SMTP_HOST ?? '',
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPass: process.env.SMTP_PASS ?? '',
  smtpFrom: process.env.SMTP_FROM ?? 'noreply@aether.local',
  supportAlertEmail: process.env.SUPPORT_ALERT_EMAIL ?? process.env.ADMIN_EMAIL ?? '',
  geoCountryHeaders: (process.env.GEO_COUNTRY_HEADERS ?? 'cf-ipcountry,x-country-code,x-forwarded-country')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean),
};

const INSECURE_JWT_SECRETS = new Set([
  'aether-dev-secret-change-in-production',
  'changeme',
  'secret',
]);

const INSECURE_ADMIN_PASSWORDS = new Set([
  'ChangeMe-Admin-2026!',
  'admin',
  'password',
]);

export function validateConfig(): void {
  if (!config.isProduction) return;

  if (config.devAuthBypass) {
    throw new Error('DEV_AUTH_BYPASS must be false in production');
  }

  if (!config.jwtSecret || config.jwtSecret.length < 32 || INSECURE_JWT_SECRETS.has(config.jwtSecret)) {
    throw new Error('JWT_SECRET must be a unique secret of at least 32 characters in production');
  }

  if (INSECURE_ADMIN_PASSWORDS.has(config.adminPassword)) {
    throw new Error('ADMIN_PASSWORD must be changed from the default in production');
  }

  if (
    config.databaseUrl.includes('localhost') ||
    config.databaseUrl.includes('aether@localhost') ||
    /postgresql:\/\/aetheradmin:aether@/.test(config.databaseUrl)
  ) {
    throw new Error('DATABASE_URL must point to a production database with strong credentials');
  }

  if (!config.corsOrigin || config.corsOrigin.includes('*')) {
    throw new Error('CORS_ORIGIN must be a single explicit origin in production (wildcards not allowed)');
  }

  try {
    const origin = new URL(config.corsOrigin);
    if (origin.protocol !== 'https:') {
      throw new Error('CORS_ORIGIN must use https in production');
    }
  } catch {
    throw new Error('CORS_ORIGIN must be a valid URL in production');
  }
}
