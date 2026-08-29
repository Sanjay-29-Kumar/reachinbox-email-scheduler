import React from 'react';
import { ArrowLeft, Star, Trash2, Archive, ChevronDown } from 'lucide-react';
import type { EmailJob } from '../services/api';

interface EmailDetailViewProps {
  email: EmailJob;
  onBack: () => void;
  onDelete?: (id: string) => void;
}

export const EmailDetailView: React.FC<EmailDetailViewProps> = ({
  email,
  onBack,
  onDelete,
}) => {
  const formattedDate = email.createdAt
    ? new Date(email.createdAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : 'Recently';

  const recipientName = email.recipientEmail.split('@')[0] || email.recipientEmail;
  const initial = (email.recipientEmail.charAt(0) || 'A').toUpperCase();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#FFFFFF',
        overflowY: 'auto',
      }}
    >
      {/* Top Bar matching Figma exact layout */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid #F3F4F6',
        }}
      >
        {/* Back Arrow + Subject Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
          <button
            onClick={onBack}
            style={{
              padding: '6px',
              borderRadius: '50%',
              color: '#374151',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <ArrowLeft size={20} />
          </button>

          <h2
            style={{
              fontSize: '17px',
              fontWeight: 700,
              color: '#111827',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {email.subject || 'Email Details'}
          </h2>
        </div>

        {/* Action Icons on Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#9CA3AF' }}>
          <button title="Star" style={{ color: email.starred ? '#F59E0B' : '#9CA3AF' }}>
            <Star size={18} fill={email.starred ? '#F59E0B' : 'none'} />
          </button>
          <button
            title="Delete / Cancel"
            onClick={() => onDelete && onDelete(email.id)}
            style={{ color: '#9CA3AF' }}
          >
            <Trash2 size={18} />
          </button>
          <button title="Archive" style={{ color: '#9CA3AF' }}>
            <Archive size={18} />
          </button>

          {/* User Small Avatar */}
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#00A859',
              overflow: 'hidden',
              marginLeft: '4px',
              color: '#FFFFFF',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
            }}
          >
            {initial}
          </div>
        </div>
      </div>

      {/* Main Email Content */}
      <div style={{ padding: '32px 48px', maxWidth: '900px' }}>
        {/* Sender Info Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '28px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Green Circle Avatar */}
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#00A859',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: 700,
              }}
            >
              {initial}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
                  {recipientName}
                </span>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>
                  &lt;{email.recipientEmail}&gt;
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: '#6B7280',
                  marginTop: '2px',
                  cursor: 'pointer',
                }}
              >
                <span>Status: <strong>{email.status}</strong></span>
                <ChevronDown size={14} />
              </div>
            </div>
          </div>

          <div style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>
            {formattedDate}
          </div>
        </div>

        {/* Email Message Content */}
        <div style={{ fontSize: '14.5px', color: '#1F2937', lineHeight: '1.7' }}>
          {/* Yellow Highlight Banner */}
          <div
            style={{
              backgroundColor: '#FEF9C3',
              borderLeft: '4px solid #F59E0B',
              padding: '16px 20px',
              borderRadius: '0 8px 8px 0',
              marginBottom: '24px',
              color: '#1F2937',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#F59E0B' }}>⚡</span>
              <span>Scheduled Job ID: {email.id} | Status: {email.status}</span>
              <span style={{ color: '#F59E0B' }}>⚡</span>
            </div>
            <div style={{ fontSize: '13px', color: '#4B5563' }}>
              Scheduled for: {new Date(email.scheduledAt).toLocaleString()}
              {email.sentAt && ` | Sent at: ${new Date(email.sentAt).toLocaleString()}`}
              {email.lastError && ` | Error: ${email.lastError}`}
            </div>
          </div>

          {/* Email Body from PostgreSQL */}
          <div
            style={{
              whiteSpace: 'pre-wrap',
              fontSize: '14.5px',
              color: '#111827',
              lineHeight: '1.7',
              marginBottom: '24px',
            }}
          >
            {email.body}
          </div>
        </div>
      </div>
    </div>
  );
};
