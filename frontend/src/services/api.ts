const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  senders?: Array<{ id: string; email: string; name?: string }>;
}

export interface ConnectedAccount {
  id: string;
  userId: string;
  provider: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailJob {
  id: string;
  userId: string;
  senderId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: 'SCHEDULED' | 'PROCESSING' | 'RETRYING' | 'SENT' | 'FAILED' | 'CANCELLED';
  attempts: number;
  lastError?: string | null;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  starred?: boolean;
}

export interface ScheduleEmailPayload {
  senderId?: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  idempotencyKey?: string;
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('reachinbox_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getGoogleAuthUrl(): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/api/auth/google?redirect=false`, {
    headers: { Accept: 'application/json' },
  });
  const data = await res.json();
  return data.url || `${API_BASE_URL}/api/auth/google`;
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data || null;
  } catch (err) {
    console.warn('Failed to fetch current user:', err);
    return null;
  }
}

export async function getConnectedAccounts(): Promise<ConnectedAccount[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/accounts`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch (err) {
    console.warn('Failed to fetch connected accounts:', err);
    return [];
  }
}

export async function disconnectAccount(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/accounts/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to disconnect account:', err);
    return false;
  }
}

export async function getEmailJobs(): Promise<EmailJob[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/emails`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch (err) {
    console.warn('Failed to fetch email jobs:', err);
    return [];
  }
}

export async function searchEmailJobs(query: string, status?: string): Promise<EmailJob[]> {
  try {
    const params = new URLSearchParams({ q: query });
    if (status) params.append('status', status);

    const res = await fetch(`${API_BASE_URL}/api/emails/search?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data || [];
  } catch (err) {
    console.warn('Failed to search email jobs:', err);
    return [];
  }
}

export async function scheduleEmail(payload: ScheduleEmailPayload): Promise<EmailJob> {
  const idempotencyKey = payload.idempotencyKey || `job-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const res = await fetch(`${API_BASE_URL}/api/emails/schedule`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-idempotency-key': idempotencyKey,
      ...getAuthHeader(),
    },
    body: JSON.stringify({
      ...payload,
      idempotencyKey,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to schedule email');
  }
  return data.data;
}

export async function cancelEmailJob(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/emails/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to cancel email job:', err);
    return false;
  }
}
