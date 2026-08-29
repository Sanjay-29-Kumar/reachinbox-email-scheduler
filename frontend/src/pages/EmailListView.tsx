import React from 'react';
import { Star, Clock, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import type { EmailJob } from '../services/api';

interface EmailListViewProps {
  type: 'scheduled' | 'sent';
  emails: EmailJob[];
  loading?: boolean;
  onSelectEmail: (email: EmailJob) => void;
  onCancelEmail?: (id: string) => void;
  onToggleStar?: (id: string) => void;
}

export const EmailListView: React.FC<EmailListViewProps> = ({
  type,
  emails,
  loading = false,
  onSelectEmail,
  onCancelEmail,
  onToggleStar,
}) => {
  const formatScheduledTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const day = date.toLocaleDateString('en-US', { weekday: 'short' });
      const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
      return `${day} ${time}`;
    } catch {
      return dateStr;
    }
  };

  if (loading && emails.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '50vh',
          color: '#9CA3AF',
        }}
      >
        <Loader2 size={32} className="animate-spin" style={{ marginBottom: '12px', color: '#00A859' }} />
        <div style={{ fontSize: '14px', fontWeight: 500 }}>Loading emails from backend...</div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '60vh',
          color: '#9CA3AF',
        }}
      >
        <Clock size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
        <div style={{ fontSize: '15px', fontWeight: 500 }}>
          {type === 'scheduled' ? 'No scheduled emails' : 'No sent emails'}
        </div>
        <div style={{ fontSize: '13px', marginTop: '4px' }}>
          {type === 'scheduled' ? 'Click "Compose" to schedule your first email' : 'Sent emails will appear here'}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      {emails.map((email) => {
        const recipientDisplay = email.recipientEmail.split('@')[0] || email.recipientEmail;
        const formattedRecipient = recipientDisplay.charAt(0).toUpperCase() + recipientDisplay.slice(1);

        return (
          <div
            key={email.id}
            onClick={() => onSelectEmail(email)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '14px 16px',
              borderBottom: '1px solid #F9FAFB',
              cursor: 'pointer',
              transition: 'background-color 0.1s ease',
              gap: '16px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FBFDFB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {/* Recipient */}
            <div
              style={{
                width: '160px',
                minWidth: '160px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#111827',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              To: {formattedRecipient}
            </div>

            {/* Status Badge */}
            {email.status === 'SCHEDULED' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#FEF3C7',
                  color: '#D97706',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '9999px',
                  whiteSpace: 'nowrap',
                }}
              >
                <Clock size={11} />
                <span>{formatScheduledTime(email.scheduledAt)}</span>
              </div>
            )}

            {email.status === 'PROCESSING' && (
              <div
                style={{
                  backgroundColor: '#E0F2FE',
                  color: '#0284C7',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '9999px',
                  whiteSpace: 'nowrap',
                }}
              >
                Processing...
              </div>
            )}

            {email.status === 'RETRYING' && (
              <div
                style={{
                  backgroundColor: '#FEF3C7',
                  color: '#B45309',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '9999px',
                  whiteSpace: 'nowrap',
                }}
              >
                Retrying (Attempt {email.attempts})
              </div>
            )}

            {email.status === 'SENT' && (
              <div
                style={{
                  backgroundColor: '#F3F4F6',
                  color: '#4B5563',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '9999px',
                  whiteSpace: 'nowrap',
                }}
              >
                Sent
              </div>
            )}

            {email.status === 'FAILED' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#FEE2E2',
                  color: '#B91C1C',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '9999px',
                  whiteSpace: 'nowrap',
                }}
              >
                <AlertCircle size={11} />
                <span>Failed</span>
              </div>
            )}

            {email.status === 'CANCELLED' && (
              <div
                style={{
                  backgroundColor: '#F3F4F6',
                  color: '#9CA3AF',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '9999px',
                  whiteSpace: 'nowrap',
                }}
              >
                Cancelled
              </div>
            )}

            {/* Subject + Snippet */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              <span style={{ fontWeight: 600, color: '#111827' }}>{email.subject}</span>
              <span style={{ color: '#6B7280' }}>
                - {email.body ? email.body.replace(/<[^>]*>?/gm, '').substring(0, 100) : ''}...
              </span>
            </div>

            {/* Actions: Cancel & Star */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#D1D5DB',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {email.status === 'SCHEDULED' && onCancelEmail && (
                <button
                  title="Cancel scheduled send"
                  onClick={() => onCancelEmail(email.id)}
                  style={{
                    color: '#9CA3AF',
                    padding: '4px',
                    borderRadius: '4px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#EF4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#9CA3AF';
                  }}
                >
                  <Trash2 size={15} />
                </button>
              )}

              <button
                onClick={() => onToggleStar && onToggleStar(email.id)}
                style={{
                  color: email.starred ? '#F59E0B' : '#D1D5DB',
                  padding: '4px',
                }}
                onMouseEnter={(e) => {
                  if (!email.starred) e.currentTarget.style.color = '#9CA3AF';
                }}
                onMouseLeave={(e) => {
                  if (!email.starred) e.currentTarget.style.color = '#D1D5DB';
                }}
              >
                <Star size={16} fill={email.starred ? '#F59E0B' : 'none'} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
