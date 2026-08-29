export interface SendEmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
}

export interface SendEmailResult {
  messageId: string;
  provider: string;
  rawResponse?: any;
}

export interface EmailProvider {
  name: string;
  send(payload: SendEmailPayload): Promise<SendEmailResult>;
}
