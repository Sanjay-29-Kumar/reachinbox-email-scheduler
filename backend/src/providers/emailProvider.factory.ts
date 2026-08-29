import { EmailProvider } from './emailProvider.interface';
import { MockEmailProvider } from './mockProvider';
import { ResendEmailProvider } from './resendProvider';

let activeProviderInstance: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (activeProviderInstance) {
    return activeProviderInstance;
  }

  const providerType = (process.env.EMAIL_PROVIDER || 'resend').toLowerCase();

  switch (providerType) {
    case 'mock':
      console.log('[EmailProviderFactory] Instantiating MockEmailProvider');
      activeProviderInstance = new MockEmailProvider();
      break;

    case 'resend':
    default:
      console.log('[EmailProviderFactory] Instantiating ResendEmailProvider');
      activeProviderInstance = new ResendEmailProvider();
      break;
  }

  return activeProviderInstance;
}

export function setTestEmailProvider(provider: EmailProvider | null) {
  activeProviderInstance = provider;
}
