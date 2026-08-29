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
  RETRYING: 'RETRYING',
  SENT: 'SENT',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

const concurrency = parseInt(process.env.EMAIL_WORKER_CONCURRENCY || '5', 10);

console.log(`Starting Email Worker for queue "${EMAIL_QUEUE_NAME}" with concurrency: ${concurrency}`);

export const emailWorker = new Worker<EmailJobData>(
  EMAIL_QUEUE_NAME,
  async (job: Job<EmailJobData>) => {
    const { emailJobId } = job.data;
    const currentAttempt = job.attemptsMade + 1;
    const maxAttempts = job.opts.attempts || parseInt(process.env.EMAIL_MAX_ATTEMPTS || '3', 10);

    console.log(`[Worker] Picked up job ${job.id} for EmailJobId: ${emailJobId} (Attempt ${currentAttempt}/${maxAttempts})`);

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

    // 3. Safe check: If CANCELLED, exit safely without sending
    if (emailJob.status === EmailJobStatus.CANCELLED) {
      console.log(`[Worker] EmailJob ${emailJobId} is CANCELLED. Skipping.`);
      return;
    }

    // 4. Atomic transition: SCHEDULED / RETRYING -> PROCESSING & update attempts
    const updateResult = await prisma.emailJob.updateMany({
      where: {
        id: emailJobId,
        status: {
          in: [EmailJobStatus.SCHEDULED, EmailJobStatus.RETRYING],
        },
      },
      data: {
        status: EmailJobStatus.PROCESSING,
        attempts: currentAttempt,
      },
    });

    if (updateResult.count === 0) {
      console.log(`[Worker] EmailJob ${emailJobId} status transition ignored (Current status: ${emailJob.status}). Skipping.`);
      return;
    }

    console.log(`[Worker] Processing email send (Attempt ${currentAttempt}/${maxAttempts}) for recipient: ${emailJob.recipientEmail}, Subject: "${emailJob.subject}"`);

    // 5. Call Real Email Sending Service
    try {
      await sendEmail({
        to: emailJob.recipientEmail,
        subject: emailJob.subject,
        text: emailJob.body,
      });

      // 6. On Success: Update status to SENT, set sentAt, clear lastError
      await prisma.emailJob.update({
        where: { id: emailJobId },
        data: {
          status: EmailJobStatus.SENT,
          sentAt: new Date(),
          lastError: null,
        },
      });

      console.log(`[Worker] Successfully sent email (Attempt ${currentAttempt}/${maxAttempts}) and updated EmailJob ${emailJobId} to SENT.`);
    } catch (sendError: any) {
      const errorMessage = sendError instanceof Error ? sendError.message : 'Unknown email send error';
      console.error(`[Worker Error] Send failed for EmailJob ${emailJobId} (Attempt ${currentAttempt}/${maxAttempts}): ${errorMessage}`);

      // 7. Check if retries remain in BullMQ
      if (currentAttempt < maxAttempts) {
        console.log(`[Worker] Retries remaining (${maxAttempts - currentAttempt}). Updating status to RETRYING for EmailJob ${emailJobId}.`);
        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: EmailJobStatus.RETRYING,
            lastError: errorMessage,
          },
        });
      } else {
        console.log(`[Worker] Max attempts (${maxAttempts}) exhausted. Updating status to FAILED for EmailJob ${emailJobId}.`);
        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: EmailJobStatus.FAILED,
            lastError: errorMessage,
          },
        });
      }

      // Re-throw error so BullMQ handles exponential backoff retry scheduling or job failure
      throw new Error(errorMessage);
    }
  },
  {
    connection: redisConnectionOptions,
    concurrency,
  }
);

emailWorker.on('failed', (job, err) => {
  const attempts = job?.attemptsMade || 0;
  const maxAttempts = job?.opts.attempts || 3;
  console.error(`[Worker Event] Job ${job?.id} attempt ${attempts}/${maxAttempts} failed:`, err.message);
});
