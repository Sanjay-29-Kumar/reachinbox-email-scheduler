import { EmailProvider, SendEmailPayload, SendEmailResult } from './emailProvider.interface';

export class ResendEmailProvider implements EmailProvider {
  name = 'resend';

  async send(payload: SendEmailPayload): Promise<SendEmailResult> {
    const { to, subject, text, html, from } = payload;
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.warn('[ResendEmailProvider Warning] RESEND_API_KEY not configured in environment. Using fallback simulated HTTP API payload.');
      const fallbackId = `resend-sim-${Date.now()}`;
      return {
        messageId: fallbackId,
        provider: this.name,
        rawResponse: { id: fallbackId, simulated: true },
      };
    }

    const senderFrom = from || process.env.EMAIL_FROM || 'ReachInbox <onboarding@resend.dev>';

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: senderFrom,
          to: [to],
          subject,
          text,
          html: html || text,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Resend API HTTP ${response.status}: ${errText}`);
      }

      const data = (await response.json()) as { id: string };
      console.log(`[ResendEmailProvider] Email sent via Resend API to ${to}. MessageId: ${data.id}`);

      return {
        messageId: data.id || `resend-${Date.now()}`,
        provider: this.name,
        rawResponse: data,
      };
    } catch (error: any) {
      console.error(`[ResendEmailProvider Error] Failed to send email to ${to}:`, error?.message || error);
      throw error;
    }
  }
}
