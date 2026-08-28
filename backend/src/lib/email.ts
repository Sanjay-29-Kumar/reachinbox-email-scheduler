import nodemailer, { Transporter } from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

let transporterInstance: Transporter | null = null;

export async function getTransporter(): Promise<Transporter> {
  if (transporterInstance) {
    return transporterInstance;
  }

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  let user = process.env.SMTP_USER;
  let pass = process.env.SMTP_PASS;

  // Auto-generate Ethereal test account if credentials are not configured
  if (!user || !pass) {
    console.log('[SMTP Info] No SMTP_USER/SMTP_PASS found in environment. Creating automated Ethereal Email test account...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      user = testAccount.user;
      pass = testAccount.pass;
      console.log(`[SMTP Info] Ethereal Test Account created successfully: User ${user}`);
      
      transporterInstance = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user,
          pass,
        },
      });
      return transporterInstance;
    } catch (testAccErr) {
      console.warn('[SMTP Warning] Failed to create Ethereal test account:', testAccErr);
    }
  }

  transporterInstance = nodemailer.createTransport({
    host: host || 'smtp.ethereal.email',
    port,
    secure,
    auth: {
      user: user || '',
      pass: pass || '',
    },
  });

  return transporterInstance;
}

export async function sendEmail(options: SendEmailOptions) {
  const { to, subject, text, html } = options;
  const transporter = await getTransporter();

  const from = process.env.SMTP_FROM || '"ReachInbox Email Scheduler" <no-reply@reachinbox.ai>';

  const mailOptions = {
    from,
    to,
    subject,
    text,
    html: html || text,
  };

  const info = await transporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info);
  
  console.log(`[Email Transporter] Email sent to ${to}. MessageId: ${info.messageId}`);
  if (previewUrl) {
    console.log(`[Email Transporter] Ethereal Preview URL: ${previewUrl}`);
  }

  return info;
}
