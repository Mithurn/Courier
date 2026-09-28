import { DelayedError, Worker } from 'bullmq';
import { redis } from './redis';
import { env } from './env';
import { prisma } from './prisma';
import { QUEUE_NAME, EmailJobData } from './queues/email-queue';
import { tryConsumeHourlySlot, claimRateLimitAlert } from './rate-limit';
import { tryClaimSendSlot } from './send-pacing';
import { transporterFor } from './mailer';
import { indexEmail } from './es';
import { notifyRateLimitHit } from './services/slack-notify.service';

const worker = new Worker<EmailJobData>(
  QUEUE_NAME,
  async (job, token) => {
    const email = await prisma.scheduledEmail.findUnique({
      where: { id: job.data.emailId },
      include: { sender: true },
    });
    if (!email) return; // deleted or bad data, nothing to do

    if (email.status !== 'scheduled') return; // already handled, idempotent no-op

    // Pacing before rate limit, so a paced retry never inflates the hourly count.
    const paceDelay = await tryClaimSendSlot(email.senderId, email.delayMs);
    if (paceDelay > 0) {
      await job.moveToDelayed(Date.now() + paceDelay, token);
      throw new DelayedError();
    }

    const { allowed, retryAfterMs } = await tryConsumeHourlySlot(
      email.senderId,
      email.sender.hourlyLimit,
    );
    if (!allowed) {
      if (await claimRateLimitAlert(email.senderId)) {
        await notifyRateLimitHit(
          email.sender.ownerId,
          `:warning: *${email.sender.name}* hit its hourly limit (${email.sender.hourlyLimit}/hr). Remaining emails are rescheduled into the next window.`,
        );
      }
      await job.moveToDelayed(Date.now() + retryAfterMs, token);
      throw new DelayedError();
    }

    const locked = await prisma.scheduledEmail.updateMany({
      where: { id: email.id, status: 'scheduled' },
      data: { status: 'sending' },
    });
    if (locked.count === 0) return; // another worker/attempt already took it

    try {
      const transporter = transporterFor(email.sender);
      await transporter.sendMail({
        from: email.sender.smtpUser,
        to: email.toEmail,
        subject: email.subject,
        text: email.body,
      });

      const sent = await prisma.scheduledEmail.update({
        where: { id: email.id },
        data: { status: 'sent', sentAt: new Date() },
      });
      await indexEmail(sent).catch((err) => console.error('ES index failed:', err.message));
    } catch (err) {
      const attemptsExhausted = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      const failed = await prisma.scheduledEmail.update({
        where: { id: email.id },
        data: attemptsExhausted
          ? { status: 'failed', failReason: (err as Error).message }
          : { status: 'scheduled' }, // let BullMQ's retry pick it back up
      });
      await indexEmail(failed).catch((e) => console.error('ES index failed:', e.message));
      throw err;
    }
  },
  { connection: redis, concurrency: env.WORKER_CONCURRENCY },
);

worker.on('failed', (job, err) => {
  console.error(`job ${job?.id} failed:`, err.message);
});

// A stalled job that was mid-send may or may not have gone out; fail it rather than risk a duplicate.
worker.on('stalled', (jobId) => {
  prisma.scheduledEmail
    .updateMany({
      where: { id: jobId, status: 'sending' },
      data: { status: 'failed', failReason: 'Worker interrupted during send' },
    })
    .catch((err) => console.error('stalled handler failed:', err.message));
});

async function shutdown() {
  await worker.close();
  await prisma.$disconnect();
  await redis.quit().catch(() => undefined);
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log('Courier worker started');
