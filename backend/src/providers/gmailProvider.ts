import { EmailProvider, SendEmailPayload, SendEmailResult } from './emailProvider.interface';
import prisma from '../lib/prisma';
import { refreshGoogleAccessToken } from '../services/auth.service';

export class GmailEmailProvider implements EmailProvider {
  name = 'gmail';

  async send(payload: SendEmailPayload): Promise<SendEmailResult> {
    const { to, subject, text, html, from } = payload;

    // 1. Locate the connected Gmail account in PostgreSQL
    const connectedAccount = await prisma.connectedAccount.findFirst({
      where: from ? { email: from, provider: 'google' } : { provider: 'google' },
      orderBy: { updatedAt: 'desc' },
    });

    if (!connectedAccount || !connectedAccount.refreshToken) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[GmailEmailProvider Warning] No connected Google account found in database. Using simulated fallback mode.');
        const fallbackId = `gmail-sim-${Date.now()}`;
        return {
          messageId: fallbackId,
          provider: this.name,
          rawResponse: { id: fallbackId, simulated: true },
        };
      }
      throw new Error('No connected Google/Gmail account found with a valid refresh token');
    }

    try {
      // 2. Refresh Google Access Token
      const accessToken = await refreshGoogleAccessToken(connectedAccount.refreshToken);

      // 3. Construct RFC 2822 MIME message
      const senderAddress = connectedAccount.email;
      const content = html || text || '';
      const isHtml = Boolean(html);

      const mimeLines = [
        `From: ${senderAddress}`,
        `To: ${to}`,
        `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
        'MIME-Version: 1.0',
        `Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset=utf-8`,
        'Content-Transfer-Encoding: base64',
        '',
        Buffer.from(content).toString('base64'),
      ];

      const rawMime = mimeLines.join('\r\n');
      const base64UrlRaw = Buffer.from(rawMime).toString('base64url');

      // 4. Send via Gmail REST API
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: base64UrlRaw,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gmail API HTTP ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as { id: string; threadId?: string };
      console.log(`[GmailEmailProvider] Email sent via Gmail API to ${to}. MessageId: ${data.id}`);

      return {
        messageId: data.id || `gmail-${Date.now()}`,
        provider: this.name,
        rawResponse: data,
      };
    } catch (error: any) {
      console.error(`[GmailEmailProvider Error] Failed to send email to ${to}:`, error?.message || error);
      throw error;
    }
  }
}
