import { prisma } from '../prisma';
import { emailQueue, EmailJob } from '../queues/email-queue';

const BATCH_SIZE = 1000;

// Re-adds every scheduled row on boot; jobId = email id, so jobs that already exist are skipped.
export async function requeueScheduledEmails(): Promise<number> {
  let cursor: string | undefined;
  let total = 0;

  for (;;) {
    const rows = await prisma.scheduledEmail.findMany({
      where: { status: 'scheduled' },
      select: { id: true, scheduledAt: true },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (rows.length === 0) return total;

    const now = Date.now();
    await emailQueue.addBulk(
      rows.map((row) => ({
        name: EmailJob.SEND,
        data: { emailId: row.id },
        opts: { jobId: row.id, delay: Math.max(0, row.scheduledAt.getTime() - now) },
      })),
    );
    total += rows.length;
    cursor = rows[rows.length - 1].id;
  }
}
