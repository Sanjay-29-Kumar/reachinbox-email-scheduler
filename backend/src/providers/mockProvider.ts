import { EmailProvider, SendEmailPayload, SendEmailResult } from './emailProvider.interface';

export class MockEmailProvider implements EmailProvider {
  name = 'mock';
  public shouldFail = false;
  public failureMessage = 'Simulated Mock Email Provider Error';

  async send(payload: SendEmailPayload): Promise<SendEmailResult> {
    const { to, subject } = payload;

    if (this.shouldFail) {
      console.error(`[MockEmailProvider] Simulated failure sending email to ${to}`);
      throw new Error(this.failureMessage);
    }

    const messageId = `mock-msg-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    console.log(`[MockEmailProvider] Mock email delivered to ${to} ("${subject}"). MessageId: ${messageId}`);

    return {
      messageId,
      provider: this.name,
      rawResponse: { status: 'delivered', recipient: to },
    };
  }
}
