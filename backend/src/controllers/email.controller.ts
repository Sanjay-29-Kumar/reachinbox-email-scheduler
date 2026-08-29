import { Request, Response } from 'express';
import { scheduleEmail, getEmailJobs, cancelEmailJob, EmailJobStatus } from '../services/email.service';
import { searchEmailJobs } from '../services/elasticsearch.service';
import { emailQueue } from '../queues/email.queue';
import prisma from '../lib/prisma';

export async function scheduleEmailHandler(req: Request, res: Response) {
  try {
    let { userId, senderId, recipientEmail, subject, body, scheduledAt, idempotencyKey } = req.body;

    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      idempotencyKey = `job-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    // 1. Idempotency Check: Return existing record if idempotencyKey already processed
    const existingJob = await prisma.emailJob.findUnique({
      where: { idempotencyKey },
    });

    if (existingJob) {
      return res.status(200).json({
        success: true,
        message: 'Email job already scheduled',
        data: existingJob,
      });
    }

    // 2. User & Sender Auto-Resolution (fallback to authenticated user or default DB user/sender)
    if (!userId) {
      userId = (req as any).user?.userId;
    }

    if (!userId) {
      const defaultUser = await prisma.user.findFirst({
        include: { senders: true },
      });
      if (defaultUser) {
        userId = defaultUser.id;
        if (!senderId && defaultUser.senders.length > 0) {
          senderId = defaultUser.senders[0].id;
        }
      } else {
        // Create initial default user and sender if database is fresh
        const createdUser = await prisma.user.create({
          data: {
            email: 'oliver.brown@domain.io',
            name: 'Oliver Brown',
            senders: {
              create: {
                email: 'oliver.brown@domain.io',
                name: 'Oliver Brown',
              },
            },
          },
          include: { senders: true },
        });
        userId = createdUser.id;
        senderId = createdUser.senders[0].id;
      }
    }

    if (!senderId) {
      const sender = await prisma.sender.findFirst({ where: { userId } });
      if (sender) {
        senderId = sender.id;
      } else {
        const newSender = await prisma.sender.create({
          data: {
            userId,
            email: 'oliver.brown@domain.io',
            name: 'Oliver Brown',
          },
        });
        senderId = newSender.id;
      }
    }

    // 3. Input Validations
    if (!recipientEmail || typeof recipientEmail !== 'string' || !recipientEmail.includes('@')) {
      return res.status(400).json({ success: false, message: 'valid recipientEmail is required' });
    }
    if (!subject || typeof subject !== 'string' || subject.trim() === '') {
      return res.status(400).json({ success: false, message: 'subject cannot be empty' });
    }
    if (!body || typeof body !== 'string' || body.trim() === '') {
      return res.status(400).json({ success: false, message: 'body cannot be empty' });
    }
    if (!scheduledAt || isNaN(Date.parse(scheduledAt))) {
      return res.status(400).json({ success: false, message: 'scheduledAt must be a valid ISO date string' });
    }
    if (new Date(scheduledAt).getTime() <= Date.now() - 5000) {
      return res.status(400).json({ success: false, message: 'scheduledAt must be a future date' });
    }

    const emailJob = await scheduleEmail({
      userId,
      senderId,
      recipientEmail,
      subject,
      body,
      scheduledAt,
      idempotencyKey,
    });

    return res.status(201).json({
      success: true,
      message: 'Email job scheduled successfully',
      data: emailJob,
    });
  } catch (error: any) {
    console.error('Error scheduling email:', error);
    return res.status(400).json({
      success: false,
      message: error?.message || 'Failed to schedule email job',
    });
  }
}

export async function getEmailsHandler(req: Request, res: Response) {
  try {
    const jobs = await getEmailJobs();
    return res.status(200).json({
      success: true,
      data: jobs,
    });
  } catch (error: any) {
    console.error('Error fetching email jobs:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to fetch email jobs',
    });
  }
}

export async function cancelEmailHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ success: false, message: 'Email job ID is required' });
    }

    const cancelledJob = await cancelEmailJob(id);
    return res.status(200).json({
      success: true,
      message: 'Email job cancelled successfully',
      data: cancelledJob,
    });
  } catch (error: any) {
    const statusCode = error?.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      message: error?.message || 'Failed to cancel email job',
    });
  }
}

export async function searchEmailsHandler(req: Request, res: Response) {
  try {
    const query = (req.query.q || req.query.query) as string;
    const status = req.query.status as string;

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Query parameter q is required',
      });
    }

    const validStatuses = Object.values(EmailJobStatus);
    if (status && !validStatuses.includes(status.trim().toUpperCase() as any)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status filter. Allowed values: ${validStatuses.join(', ')}`,
      });
    }

    const searchResults = await searchEmailJobs({
      query,
      status,
    });

    return res.status(200).json({
      success: true,
      count: searchResults.results.length,
      total: searchResults.total,
      data: searchResults.results,
    });
  } catch (error: any) {
    console.error('Elasticsearch search error:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to execute search on Elasticsearch',
    });
  }
}

export async function getDashboardStatsHandler(req: Request, res: Response) {
  try {
    const [scheduled, sent, failed, retrying, cancelled, processing] = await Promise.all([
      prisma.emailJob.count({ where: { status: 'SCHEDULED' } }),
      prisma.emailJob.count({ where: { status: 'SENT' } }),
      prisma.emailJob.count({ where: { status: 'FAILED' } }),
      prisma.emailJob.count({ where: { status: 'RETRYING' } }),
      prisma.emailJob.count({ where: { status: 'CANCELLED' } }),
      prisma.emailJob.count({ where: { status: 'PROCESSING' } }),
    ]);

    let queueCounts = { waiting: 0, active: 0, delayed: 0 };
    try {
      const counts = await emailQueue.getJobCounts('waiting', 'active', 'delayed');
      queueCounts = {
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        delayed: counts.delayed || 0,
      };
    } catch (qErr) {
      console.warn('Queue counts fetch warning:', qErr);
    }

    return res.status(200).json({
      success: true,
      data: {
        scheduled,
        sent,
        failed,
        retrying,
        cancelled,
        processing,
        queueWaiting: queueCounts.waiting,
        queueActive: queueCounts.active,
        queueDelayed: queueCounts.delayed,
      },
    });
  } catch (error: any) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Failed to fetch dashboard statistics',
    });
  }
}
