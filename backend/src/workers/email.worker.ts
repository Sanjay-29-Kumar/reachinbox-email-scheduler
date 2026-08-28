import dotenv from 'dotenv';
dotenv.config();

import { Worker, Job } from 'bullmq';
import { EMAIL_QUEUE_NAME, EmailJobData } from '../queues/email.queue';
import { redisConnectionOptions } from '../lib/redis';
import prisma from '../lib/prisma';
import { sendEmail } from '../lib/email';

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

    console.log(`[Worker] Processing real email send for recipient: ${emailJob.recipientEmail}, Subject: "${emailJob.subject}"`);

    // 5. Call Real Email Sending Service
    try {
      await sendEmail({
        to: emailJob.recipientEmail,
        subject: emailJob.subject,
        text: emailJob.body,
      });

      // 6. On Success: Update status to SENT and set sentAt
      await prisma.emailJob.update({
        where: { id: emailJobId },
        data: {
          status: EmailJobStatus.SENT,
          sentAt: new Date(),
        },
      });

      console.log(`[Worker] Successfully sent email and updated EmailJob ${emailJobId} to SENT.`);
    } catch (sendError: any) {
      // 7. On Failure: Update status to FAILED
      const errorMessage = sendError instanceof Error ? sendError.message : 'Unknown email send error';
      console.error(`[Worker Error] Failed to send email for EmailJob ${emailJobId}: ${errorMessage}`);

      await prisma.emailJob.update({
        where: { id: emailJobId },
        data: {
          status: EmailJobStatus.FAILED,
        },
      });

      // Throw error so BullMQ marks job failed
      throw new Error(`Email delivery failed for EmailJob ${emailJobId}`);
    }
  },
  {
    connection: redisConnectionOptions,
    concurrency,
  }
);

emailWorker.on('failed', (job, err) => {
  console.error(`[Worker Event] Job ${job?.id} failed:`, err.message);
});
