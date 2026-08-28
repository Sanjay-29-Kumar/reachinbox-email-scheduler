import { Queue } from 'bullmq';
import { redisConnectionOptions } from '../lib/redis';

export const EMAIL_QUEUE_NAME = 'email-scheduler';

export interface EmailJobData {
  emailJobId: string;
}

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConnectionOptions,
});
