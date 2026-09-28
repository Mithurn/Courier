import { app } from './app';
import { env } from './env';
import { emailQueue } from './queues/email-queue';
import { ensureIndex } from './es';
import { prisma } from './prisma';
import { redis } from './redis';
import { requeueScheduledEmails } from './services/requeue-scheduled.service';

ensureIndex().catch((err) => console.error('failed to ensure ES index:', err.message));
requeueScheduledEmails().catch((err) => console.error('requeue on boot failed:', err.message));

const server = app.listen(env.PORT, () => {
  console.log(`Courier API listening on :${env.PORT}`);
});

async function shutdown() {
  await new Promise((resolve) => server.close(resolve));
  await Promise.allSettled([emailQueue.close(), prisma.$disconnect()]);
  await redis.quit().catch(() => undefined);
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
