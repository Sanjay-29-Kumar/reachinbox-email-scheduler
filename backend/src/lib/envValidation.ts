export interface EnvValidationResult {
  isValid: boolean;
  missingVariables: string[];
}

export function validateEnvironment(): EnvValidationResult {
  const requiredVariables = [
    'DATABASE_URL',
    'REDIS_HOST',
    'REDIS_PORT',
  ];

  const missingVariables: string[] = [];

  for (const envVar of requiredVariables) {
    if (!process.env[envVar] || process.env[envVar]?.trim() === '') {
      missingVariables.push(envVar);
    }
  }

  const provider = (process.env.EMAIL_PROVIDER || 'resend').toLowerCase();
  if (provider === 'resend' && !process.env.RESEND_API_KEY && process.env.NODE_ENV === 'production') {
    console.warn('[Env Validation Warning] RESEND_API_KEY is not set for production Resend provider');
  }

  if (missingVariables.length > 0) {
    console.error(`[Env Validation Error] Missing required environment variables: ${missingVariables.join(', ')}`);
    return {
      isValid: false,
      missingVariables,
    };
  }

  console.log('[Env Validation Info] Environment configuration validated successfully.');
  return {
    isValid: true,
    missingVariables: [],
  };
}
