export async function sendSlackNotification(message: string): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl || webhookUrl.trim() === '') {
    // Slack integration is optional. Safely no-op when not configured.
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: message,
      }),
    });

    if (!response.ok) {
      console.warn(`[Slack Warning] Slack webhook returned HTTP ${response.status}`);
      return false;
    }

    return true;
  } catch (error: any) {
    console.warn('[Slack Warning] Failed to send Slack notification:', error?.message || error);
    // Never let Slack failure throw to caller
    return false;
  }
}

export async function notifyEmailScheduled(data: {
  recipientEmail: string;
  subject: string;
  scheduledAt: string | Date;
  emailJobId: string;
}): Promise<boolean> {
  const dateStr = typeof data.scheduledAt === 'string' ? data.scheduledAt : data.scheduledAt.toISOString();
  const message = `🕒 *Email Scheduled*\n• *Recipient:* \`${data.recipientEmail}\`\n• *Subject:* "${data.subject}"\n• *Scheduled At:* ${dateStr}\n• *Job ID:* \`${data.emailJobId}\``;
  return sendSlackNotification(message);
}

export async function notifyEmailSent(data: {
  recipientEmail: string;
  subject: string;
  emailJobId: string;
  provider: string;
}): Promise<boolean> {
  const message = `✅ *Email Sent*\n• *Recipient:* \`${data.recipientEmail}\`\n• *Subject:* "${data.subject}"\n• *Job ID:* \`${data.emailJobId}\`\n• *Provider:* ${data.provider}`;
  return sendSlackNotification(message);
}

export async function notifyEmailFailed(data: {
  recipientEmail: string;
  subject: string;
  emailJobId: string;
  failureReason: string;
  attempts: number;
}): Promise<boolean> {
  const message = `❌ *Email Failed*\n• *Recipient:* \`${data.recipientEmail}\`\n• *Subject:* "${data.subject}"\n• *Job ID:* \`${data.emailJobId}\`\n• *Attempts:* ${data.attempts}\n• *Reason:* ${data.failureReason}`;
  return sendSlackNotification(message);
}

export async function notifyEmailCancelled(data: {
  recipientEmail: string;
  subject: string;
  emailJobId: string;
}): Promise<boolean> {
  const message = `🚫 *Email Cancelled*\n• *Recipient:* \`${data.recipientEmail}\`\n• *Subject:* "${data.subject}"\n• *Job ID:* \`${data.emailJobId}\``;
  return sendSlackNotification(message);
}

export async function notifyEmailRateLimited(data: {
  recipientEmail: string;
  subject: string;
  emailJobId: string;
  rateLimitInfo: string;
}): Promise<boolean> {
  const message = `⏳ *Rate Limited*\n• *Recipient:* \`${data.recipientEmail}\`\n• *Subject:* "${data.subject}"\n• *Job ID:* \`${data.emailJobId}\`\n• *Details:* ${data.rateLimitInfo}`;
  return sendSlackNotification(message);
}
