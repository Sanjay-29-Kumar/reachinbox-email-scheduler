import dotenv from 'dotenv';
dotenv.config();

import { Worker, Job } from 'bullmq';
import { EMAIL_QUEUE_NAME, EmailJobData } from '../queues/email.queue';
import { redisConnectionOptions } from '../lib/redis';
import prisma from '../lib/prisma';

export const EmailJobStatus = {
  SCHEDULED: 'SCHEDULED',
  PROCESSING: 'PROCESSING',
  SENT: 'SENT',
  FAILED: 'FAILED',
} as const;

const concurrency = parseInt(process.env.EMAIL_WORKER_CONCURRENCY || '5', 10);

console.log(`Starting Email Worker for queue "${EMAIL_QUEUE_NAME}" with concurrency: ${concurrency}`);

export const emailWorker = new Worker<EmailJobData>(
  EMAIL_QUEUE_NAME,
  async (job: Job<EmailJobData>) => {
    const { emailJobId } = job.data;
    console.log(`[Worker] Picked up job ${job.id} for EmailJobId: ${emailJobId}`);

    // 1. Fetch EmailJob from PostgreSQL
    const emailJob = await prisma.emailJob.findUnique({
      where: { id: emailJobId },
    });

    if (!emailJob) {
      console.warn(`[Worker] EmailJob ${emailJobId} not found in database. Skipping.`);
      return;
    }

    // 2. Safe check: If already SENT, exit safely
    if (emailJob.status === EmailJobStatus.SENT) {
      console.log(`[Worker] EmailJob ${emailJobId} is already SENT. Skipping.`);
      return;
    }

    // 3. Safe check: If already PROCESSING, exit safely
    if (emailJob.status === EmailJobStatus.PROCESSING) {
      console.log(`[Worker] EmailJob ${emailJobId} is currently PROCESSING by another worker. Skipping.`);
      return;
    }

    // 4. Atomic transition: SCHEDULED -> PROCESSING
    const updateResult = await prisma.emailJob.updateMany({
      where: {
        id: emailJobId,
        status: EmailJobStatus.SCHEDULED,
      },
      data: {
        status: EmailJobStatus.PROCESSING,
      },
    });

    if (updateResult.count === 0) {
      console.log(`[Worker] EmailJob ${emailJobId} status was not SCHEDULED. Could not transition to PROCESSING. Skipping.`);
      return;
    }

    console.log(`[Worker] Processing email for recipient: ${emailJob.recipientEmail}, Subject: "${emailJob.subject}"`);

    // 5. Simulation: Update status to SENT and set sentAt to current time
    await prisma.emailJob.update({
      where: { id: emailJobId },
      data: {
        status: EmailJobStatus.SENT,
        sentAt: new Date(),
      },
    });

    console.log(`[Worker] Successfully processed and marked EmailJob ${emailJobId} as SENT.`);
  },
  {
    connection: redisConnectionOptions,
    concurrency,
  }
);

emailWorker.on('failed', (job, err) => {
  console.error(`[Worker Error] Job ${job?.id} failed with error:`, err);
});
