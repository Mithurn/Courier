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
    if (!email) {
      await job.log('Email record not found in database; skipping.');
      return { skipped: true, reason: 'not_found' };
    }

    if (email.status !== 'scheduled') {
      await job.log(`Email status is already '${email.status}'; idempotent no-op.`);
      return { skipped: true, status: email.status };
    }

    await job.updateProgress(15);
    await job.log(`Starting delivery to ${email.toEmail} via ${email.sender.smtpUser}`);

    // Pacing before rate limit, so a paced retry never inflates the hourly count.
    const paceDelay = await tryClaimSendSlot(email.senderId, email.delayMs);
    if (paceDelay > 0) {
      await job.log(`Pacing delay active: sender slot busy, waiting ${paceDelay}ms`);
      await job.moveToDelayed(Date.now() + paceDelay, token);
      throw new DelayedError();
    }

    await job.updateProgress(35);
    const hourlyLimit = email.hourlyLimit ?? email.sender.hourlyLimit;
    const { allowed, retryAt } = await tryConsumeHourlySlot(email.senderId, hourlyLimit, email.scheduledAt);
    if (!allowed) {
      await job.log(`Hourly limit reached (${hourlyLimit}/hr). Deferred to ${new Date(retryAt).toISOString()}`);
      if (await claimRateLimitAlert(email.senderId)) {
        await notifyRateLimitHit(
          email.sender.ownerId,
          `:warning: *${email.sender.name}* hit its hourly limit (${hourlyLimit}/hr). Remaining emails are rescheduled into the next window.`,
        );
        await job.log('Sent live Slack rate-limit alert.');
      }
      await job.moveToDelayed(retryAt, token);
      throw new DelayedError();
    }

    const locked = await prisma.scheduledEmail.updateMany({
      where: { id: email.id, status: 'scheduled' },
      data: { status: 'sending' },
    });
    if (locked.count === 0) {
      await job.log('Row lock failed: another worker claimed this email.');
      return { skipped: true, reason: 'concurrency_lock' };
    }

    await job.updateProgress(60);
    await job.log('Claimed DB status "sending"; dispatching SMTP message...');

    let messageId: string | undefined;
    try {
      const info = await transporterFor(email.sender).sendMail({
        from: email.sender.smtpUser,
        to: email.toEmail,
        subject: email.subject,
        html: email.body,
      });
      messageId = info.messageId;
      await job.log(`SMTP accepted message: Message-ID ${info.messageId}`);
    } catch (err) {
      const attemptsExhausted = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      await job.log(`SMTP send failed: ${(err as Error).message} (attempt ${job.attemptsMade + 1})`);
      const failed = await prisma.scheduledEmail.update({
        where: { id: email.id },
        data: attemptsExhausted
          ? { status: 'failed', failReason: (err as Error).message }
          : { status: 'scheduled' }, // let BullMQ's retry pick it back up
      });
      await indexEmail(failed).catch((e) => console.error('ES index failed:', e.message));
      throw err;
    }

    await job.updateProgress(85);
    await recordSent(email.id);
    await job.updateProgress(100);
    await job.log('Delivered successfully: updated status to "sent" and indexed in Elasticsearch.');

    return {
      emailId: email.id,
      to: email.toEmail,
      subject: email.subject,
      messageId,
      sentAt: new Date().toISOString(),
      attempts: job.attemptsMade + 1,
    };
  },
  { connection: redis, concurrency: env.WORKER_CONCURRENCY },
);

async function failExhaustedEmail(emailId: string, reason: string): Promise<void> {
  const { count } = await prisma.scheduledEmail.updateMany({
    where: { id: emailId, status: 'scheduled' },
    data: { status: 'failed', failReason: reason },
  });
  if (count === 0) return;
  const failed = await prisma.scheduledEmail.findUniqueOrThrow({ where: { id: emailId } });
  await indexEmail(failed).catch((e) => console.error('ES index failed:', e.message));
}

worker.on('failed', (job, err) => {
  console.error(`job ${job?.id} failed:`, err.message);
  if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) return;
  failExhaustedEmail(job.data.emailId, err.message).catch((e) => console.error('marking email failed errored:', e.message));
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
