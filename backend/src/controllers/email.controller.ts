import { Request, Response } from 'express';
import { scheduleEmail, getEmailJobs, cancelEmailJob } from '../services/email.service';
import prisma from '../lib/prisma';

export async function scheduleEmailHandler(req: Request, res: Response) {
  try {
    const { userId, senderId, recipientEmail, subject, body, scheduledAt, idempotencyKey } = req.body;

    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      return res.status(400).json({ success: false, message: 'idempotencyKey is required' });
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

    // 2. Input Validations
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }
    if (!senderId || typeof senderId !== 'string') {
      return res.status(400).json({ success: false, message: 'senderId is required' });
    }
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
    if (new Date(scheduledAt).getTime() <= Date.now()) {
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
