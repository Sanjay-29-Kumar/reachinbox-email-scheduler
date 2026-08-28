import prisma from '../lib/prisma';
import { emailQueue } from '../queues/email.queue';

export const EmailJobStatus = {
  SCHEDULED: 'SCHEDULED',
  PROCESSING: 'PROCESSING',
  SENT: 'SENT',
  FAILED: 'FAILED',
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

  // 5. Calculate delay and enqueue delayed job in BullMQ
  const delay = Math.max(0, scheduledDate.getTime() - Date.now());

  try {
    const bullJob = await emailQueue.add(
      'send-email',
      { emailJobId: emailJob.id },
      {
        delay,
        jobId: emailJob.id,
      }
    );

    // 6. Update bullJobId in PostgreSQL
    const updatedJob = await prisma.emailJob.update({
      where: { id: emailJob.id },
      data: { bullJobId: String(bullJob.id) },
    });

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
