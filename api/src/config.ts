import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 8080),
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://aetheradmin:aether@localhost:5432/aether',
  devAuthBypass: process.env.DEV_AUTH_BYPASS === 'true',
  azureAdTenantId: process.env.AZURE_AD_TENANT_ID ?? '',
  azureAdClientId: process.env.AZURE_AD_CLIENT_ID ?? '',
  storageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING ?? '',
  signalrConnectionString: process.env.AZURE_SIGNALR_CONNECTION_STRING ?? '',
  serviceBusConnectionString: process.env.SERVICE_BUS_CONNECTION_STRING ?? '',
  serviceBusDeletionQueue: process.env.SERVICE_BUS_DELETION_QUEUE ?? 'account-deletion',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  mediaContainer: process.env.MEDIA_CONTAINER ?? 'media',
  mediaSasMinutes: Number(process.env.MEDIA_SAS_MINUTES ?? 15),
  mediaDefaultTtlDays: Number(process.env.MEDIA_DEFAULT_TTL_DAYS ?? 7),
};
