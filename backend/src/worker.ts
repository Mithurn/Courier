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
import { requeueScheduledEmails } from './services/requeue-scheduled.service';

const RECORD_ATTEMPTS = 3;

// The mail is already out, so a DB failure here must never reset the row or retry the job.
async function recordSent(emailId: string): Promise<void> {
  for (let attempt = 1; attempt <= RECORD_ATTEMPTS; attempt++) {
    try {
      const sent = await prisma.scheduledEmail.update({
        where: { id: emailId },
        data: { status: 'sent', sentAt: new Date() },
      });
      await indexEmail(sent).catch((err) => console.error('ES index failed:', err.message));
      return;
    } catch (err) {
      console.error(`recording sent email ${emailId} failed (attempt ${attempt}):`, (err as Error).message);
    }
  }
}

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

    const hourlyLimit = email.hourlyLimit ?? email.sender.hourlyLimit;
    const { allowed, retryAfterMs } = await tryConsumeHourlySlot(email.senderId, hourlyLimit);
    if (!allowed) {
      if (await claimRateLimitAlert(email.senderId)) {
        await notifyRateLimitHit(
          email.sender.ownerId,
          `:warning: *${email.sender.name}* hit its hourly limit (${hourlyLimit}/hr). Remaining emails are rescheduled into the next window.`,
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
      await transporterFor(email.sender).sendMail({
        from: email.sender.smtpUser,
        to: email.toEmail,
        subject: email.subject,
        html: email.body,
      });
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

    await recordSent(email.id);
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

requeueScheduledEmails()
  .then((count) => console.log(`Courier worker started, re-enqueued ${count} scheduled emails`))
  .catch((err) => console.error('requeue on boot failed:', err.message));
