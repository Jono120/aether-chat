/**
 * Account deletion and TTL purge worker.
 * Deploy as Azure Function with Service Bus trigger on `account-deletion` queue.
 * Run locally: npx tsx workers/purge/index.ts
 */
import { ServiceBusClient } from '@azure/service-bus';
import 'dotenv/config';
import { pool } from '../../src/db/pool.js';
import { purgeUserAccount } from '../../src/services/account.js';
import { purgeExpiredMedia } from '../../src/services/media.js';
import { purgeExpiredMessages } from '../../src/services/messages.js';

const connectionString = process.env.SERVICE_BUS_CONNECTION_STRING ?? '';
const queueName = process.env.SERVICE_BUS_DELETION_QUEUE ?? 'account-deletion';

async function processDueDeletions() {
  const due = await pool.query(
    `SELECT dr.user_id, dr.scheduled_purge_at
     FROM deletion_requests dr
     JOIN users u ON u.id = dr.user_id
     WHERE dr.cancelled_at IS NULL
       AND dr.scheduled_purge_at <= now()
       AND u.status = 'deletion_pending'`,
  );
  for (const row of due.rows) {
    console.log('Purging scheduled account');
    await purgeUserAccount(row.user_id);
  }
}

async function runServiceBusConsumer() {
  if (!connectionString) {
    console.log('No Service Bus — running scheduled purge only');
    await processDueDeletions();
    await purgeExpiredMessages();
    await purgeExpiredMedia();
    await pool.end();
    return;
  }

  const client = new ServiceBusClient(connectionString);
  const receiver = client.createReceiver(queueName);

  const processMessage = async (message: { body: { userId?: string } }) => {
    const userId = message.body?.userId;
    if (userId) {
      await purgeUserAccount(userId);
    }
    await purgeExpiredMessages();
    await purgeExpiredMedia();
  };

  receiver.subscribe({
    processMessage: async (msg) => {
      await processMessage(msg);
    },
    processError: async (args) => {
      console.error('Service Bus error', args.error);
    },
  });

  console.log(`Listening on queue ${queueName}`);
}

runServiceBusConsumer().catch((err) => {
  console.error(err);
  process.exit(1);
});
