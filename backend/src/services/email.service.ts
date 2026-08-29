import prisma from '../lib/prisma';
import { emailQueue } from '../queues/email.queue';
import { indexEmailJob, updateEmailJobInElasticsearch } from './elasticsearch.service';
import { incrementEmailsScheduled, incrementEmailsCancelled } from '../lib/metrics';
import { notifySlack } from './slack.service';

export const EmailJobStatus = {
  SCHEDULED: 'SCHEDULED',
  PROCESSING: 'PROCESSING',
  RETRYING: 'RETRYING',
  SENT: 'SENT',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type EmailJobStatusType = (typeof EmailJobStatus)[keyof typeof EmailJobStatus];

export interface ScheduleEmailInput {
  userId: string;
  senderId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: string | Date;
  idempotencyKey: string;
}

export async function scheduleEmail(input: ScheduleEmailInput) {
  const { userId, senderId, recipientEmail, subject, body, scheduledAt, idempotencyKey } = input;

  // 1. Check idempotency: If record already exists, return it immediately
  const existingJob = await prisma.emailJob.findUnique({
    where: { idempotencyKey },
  });

  if (existingJob) {
    return existingJob;
  }

  // 2. Validate User exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error(`User with ID ${userId} does not exist`);
  }

  // 3. Validate Sender exists and belongs to User
  const sender = await prisma.sender.findFirst({
    where: { id: senderId, userId },
  });

  if (!sender) {
    throw new Error(`Sender with ID ${senderId} does not exist or does not belong to User ${userId}`);
  }

  const scheduledDate = new Date(scheduledAt);
  if (isNaN(scheduledDate.getTime())) {
    throw new Error('Invalid scheduledAt timestamp');
  }

  // 4. Create EmailJob in PostgreSQL
  let emailJob;
  try {
    emailJob = await prisma.emailJob.create({
      data: {
        userId,
        senderId,
        recipientEmail,
        subject,
        body,
        scheduledAt: scheduledDate,
        status: EmailJobStatus.SCHEDULED,
        idempotencyKey,
      },
    });
  } catch (error: any) {
    // Handle race condition for duplicate idempotencyKey
    if (error?.code === 'P2002' && error?.meta?.target?.includes('idempotencyKey')) {
      const duplicateJob = await prisma.emailJob.findUnique({
        where: { idempotencyKey },
      });
      if (duplicateJob) return duplicateJob;
    }
    throw error;
  }

  // 5. Calculate delay and enqueue delayed job in BullMQ with retry options
  const delay = Math.max(0, scheduledDate.getTime() - Date.now());
  const maxAttempts = parseInt(process.env.EMAIL_MAX_ATTEMPTS || '3', 10);
  const retryDelay = parseInt(process.env.EMAIL_RETRY_DELAY || '5000', 10);

  try {
    const bullJob = await emailQueue.add(
      'send-email',
      { emailJobId: emailJob.id },
      {
        delay,
        jobId: emailJob.id,
        attempts: maxAttempts,
        backoff: {
          type: 'exponential',
          delay: retryDelay,
        },
      }
    );

    // 6. Update bullJobId in PostgreSQL
    const updatedJob = await prisma.emailJob.update({
      where: { id: emailJob.id },
      data: { bullJobId: String(bullJob.id) },
    });

    // 7. Increment Prometheus Metrics Counter
    incrementEmailsScheduled();

    // 8. Index in Elasticsearch safely (try/catch ensures ES failure never breaks core flow)
    try {
      await indexEmailJob(updatedJob);
    } catch (esErr) {
      console.warn(`[Elasticsearch Warning] ES Indexing failed for EmailJob ${updatedJob.id}:`, esErr);
    }

    // 9. Notify Slack (Side effect - non-blocking and safe)
    notifySlack({
      event: 'SCHEDULED',
      recipientEmail: updatedJob.recipientEmail,
      subject: updatedJob.subject,
      emailJobId: updatedJob.id,
      extraDetails: `Scheduled for ${scheduledDate.toISOString()}`,
    }).catch((slackErr) => console.warn('[Slack Error] Non-blocking notification failed:', slackErr));

    return updatedJob;
  } catch (queueError) {
    console.error(`[Queue Error] Failed to enqueue job for EmailJob ${emailJob.id}:`, queueError);
    await prisma.emailJob.update({
      where: { id: emailJob.id },
      data: { status: EmailJobStatus.FAILED },
    });
    throw new Error('Failed to schedule email in queue');
  }
}

export async function getEmailJobs() {
  return prisma.emailJob.findMany({
    orderBy: {
      scheduledAt: 'desc',
    },
  });
}

export async function cancelEmailJob(emailJobId: string) {
  // 1. Fetch EmailJob from PostgreSQL
  const emailJob = await prisma.emailJob.findUnique({
    where: { id: emailJobId },
  });

  if (!emailJob) {
    const error = new Error(`Email job with ID ${emailJobId} not found`);
    (error as any).statusCode = 404;
    throw error;
  }

  // 2. Only allow cancellation when status is SCHEDULED
  if (emailJob.status !== EmailJobStatus.SCHEDULED) {
    const error = new Error(`Cannot cancel email job with status ${emailJob.status}`);
    (error as any).statusCode = 400;
    throw error;
  }

  // 3. Remove BullMQ job safely from Redis queue if bullJobId exists
  if (emailJob.bullJobId) {
    try {
      const bullJob = await emailQueue.getJob(emailJob.bullJobId);
      if (bullJob) {
        await bullJob.remove();
        console.log(`[Queue Info] Successfully removed BullMQ job ${emailJob.bullJobId} from queue.`);
      }
    } catch (queueErr) {
      console.warn(`[Queue Warning] Could not remove BullMQ job ${emailJob.bullJobId}:`, queueErr);
    }
  }

  // 4. Update status to CANCELLED in PostgreSQL
  const cancelledJob = await prisma.emailJob.update({
    where: { id: emailJobId },
    data: {
      status: EmailJobStatus.CANCELLED,
    },
  });

  // 5. Increment Prometheus Cancelled Counter
  incrementEmailsCancelled();

  // 6. Update status to CANCELLED in Elasticsearch safely
  try {
    await updateEmailJobInElasticsearch(emailJobId, { status: EmailJobStatus.CANCELLED });
  } catch (esErr) {
    console.warn(`[Elasticsearch Warning] ES Cancel update failed for EmailJob ${emailJobId}:`, esErr);
  }

  // 7. Notify Slack (Side effect - non-blocking and safe)
  notifySlack({
    event: 'CANCELLED',
    recipientEmail: cancelledJob.recipientEmail,
    subject: cancelledJob.subject,
    emailJobId: cancelledJob.id,
  }).catch((slackErr) => console.warn('[Slack Error] Non-blocking notification failed:', slackErr));

  return cancelledJob;
}
