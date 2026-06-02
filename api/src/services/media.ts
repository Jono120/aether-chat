import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { pool } from '../db/pool.js';

function getBlobClients() {
  if (!config.storageConnectionString) {
    return null;
  }
  const service = BlobServiceClient.fromConnectionString(config.storageConnectionString);
  const container = service.getContainerClient(config.mediaContainer);
  return { service, container };
}

export async function createUploadSas(userId: string, contentType: string) {
  const clients = getBlobClients();
  const mediaId = uuidv4();
  const expiresAt = new Date(Date.now() + config.mediaDefaultTtlDays * 24 * 60 * 60 * 1000);

  if (!clients) {
    const blobPath = `local/${userId}/${mediaId}`;
    await pool.query(
      `INSERT INTO media_objects (id, owner_id, blob_path, content_type, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [mediaId, userId, blobPath, contentType, expiresAt.toISOString()],
    );
    return {
      mediaId,
      uploadUrl: null,
      blobPath,
      expiresAt: expiresAt.toISOString(),
      devMode: true,
    };
  }

  const blobPath = `${userId}/${mediaId}`;
  const blobClient = clients.container.getBlockBlobClient(blobPath);

  const accountName = clients.service.accountName;
  const accountKey = parseAccountKey(config.storageConnectionString);
  const startsOn = new Date();
  const sasExpires = new Date(Date.now() + config.mediaSasMinutes * 60 * 1000);

  const sas = generateBlobSASQueryParameters(
    {
      containerName: config.mediaContainer,
      blobName: blobPath,
      permissions: BlobSASPermissions.parse('cw'),
      startsOn,
      expiresOn: sasExpires,
      contentType,
    },
    new StorageSharedKeyCredential(accountName, accountKey),
  ).toString();

  await pool.query(
    `INSERT INTO media_objects (id, owner_id, blob_path, content_type, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [mediaId, userId, blobPath, contentType, expiresAt.toISOString()],
  );

  return {
    mediaId,
    uploadUrl: `${blobClient.url}?${sas}`,
    blobPath,
    expiresAt: expiresAt.toISOString(),
    devMode: false,
  };
}

function parseAccountKey(connectionString: string): string {
  const match = connectionString.match(/AccountKey=([^;]+)/);
  if (!match) throw new Error('Invalid storage connection string');
  return match[1];
}

export async function deleteMedia(mediaId: string, userId: string) {
  const row = await pool.query(
    'SELECT blob_path FROM media_objects WHERE id = $1 AND owner_id = $2',
    [mediaId, userId],
  );
  if (!row.rows[0]) return false;

  const clients = getBlobClients();
  if (clients) {
    await clients.container.deleteBlob(row.rows[0].blob_path);
  }
  await pool.query('DELETE FROM media_objects WHERE id = $1', [mediaId]);
  return true;
}

export async function purgeExpiredMedia() {
  const expired = await pool.query(
    'SELECT id, blob_path FROM media_objects WHERE expires_at <= now()',
  );
  const clients = getBlobClients();
  for (const row of expired.rows) {
    if (clients) {
      try {
        await clients.container.deleteBlob(row.blob_path);
      } catch {
        /* blob may already be removed by lifecycle policy */
      }
    }
  }
  await pool.query('DELETE FROM media_objects WHERE expires_at <= now()');
}
