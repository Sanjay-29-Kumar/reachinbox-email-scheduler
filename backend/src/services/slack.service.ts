export interface SlackNotificationOptions {
  event: 'SCHEDULED' | 'SENT' | 'FAILED' | 'CANCELLED' | 'RATE_LIMITED';
  recipientEmail: string;
  subject: string;
  emailJobId: string;
  extraDetails?: string;
}

export async function notifySlack(textOrOptions: string | SlackNotificationOptions): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl || webhookUrl.trim() === '') {
    // Slack integration is optional. Safely no-op when not configured.
    return false;
  }

  let textMessage = '';

  if (typeof textOrOptions === 'string') {
    textMessage = textOrOptions;
  } else {
    const { event, recipientEmail, subject, emailJobId, extraDetails } = textOrOptions;
    const emojiMap: Record<string, string> = {
      SCHEDULED: '🕒',
      SENT: '✅',
      FAILED: '❌',
      CANCELLED: '🚫',
      RATE_LIMITED: '⏳',
    };

    const emoji = emojiMap[event] || '📢';
    textMessage = `${emoji} *Email ${event}*\n• *Recipient:* \`${recipientEmail}\`\n• *Subject:* "${subject}"\n• *Job ID:* \`${emailJobId}\`${extraDetails ? `\n• *Details:* ${extraDetails}` : ''}`;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: textMessage,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[Slack Warning] Slack webhook returned HTTP ${response.status}: ${errText}`);
      return false;
    }

    return true;
  } catch (error: any) {
    console.warn('[Slack Warning] Failed to send Slack notification:', error?.message || error);
    // Never let Slack failure throw to caller
    return false;
  }
}
