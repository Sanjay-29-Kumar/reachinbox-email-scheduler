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
    : 'Oct 14, 2:34 PM';

  const recipientName = email.recipientEmail.includes('amanda')
    ? 'Amanda Clark'
    : email.recipientEmail.split('@')[0] || 'Amanda Clark';

  const initial = (email.recipientEmail.charAt(0) || 'A').toUpperCase();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#FFFFFF',
        overflowY: 'auto',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Top Bar matching Figma exact layout */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 28px',
          borderBottom: '1px solid #F1F5F9',
        }}
      >
        {/* Back Arrow + Subject Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
          <button
            onClick={onBack}
            style={{
              padding: '6px',
              borderRadius: '50%',
              color: '#1E293B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F1F5F9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <ArrowLeft size={20} />
          </button>

          <h2
            style={{
              fontSize: '19px',
              fontWeight: 600,
              color: '#0F172A',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: '-0.2px',
            }}
          >
            {email.subject || 'Oliver, hello there! | MJWY194'}
          </h2>
        </div>

        {/* Action Icons on Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#94A3B8' }}>
          <button title="Star" style={{ color: email.starred ? '#F59E0B' : '#94A3B8', cursor: 'pointer' }}>
            <Star size={18} fill={email.starred ? '#F59E0B' : 'none'} />
          </button>
          <button
            title="Delete / Cancel"
            onClick={() => onDelete && onDelete(email.id)}
            style={{ color: '#94A3B8', cursor: 'pointer' }}
          >
            <Trash2 size={18} />
          </button>
          <button title="Archive" style={{ color: '#94A3B8', cursor: 'pointer' }}>
            <Archive size={18} />
          </button>
        </div>
      </div>

      {/* Main Email Content */}
      <div style={{ padding: '32px 48px', maxWidth: '880px' }}>
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
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: '#00C853',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '17px',
                fontWeight: 700,
                flexShrink: 0,
                boxShadow: '0 2px 4px rgba(0, 200, 83, 0.2)',
              }}
            >
              {initial === 'O' ? 'A' : initial}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                  {recipientName.toLowerCase().includes('oliver') ? 'Amanda Clark' : recipientName}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '13px',
                  color: '#64748B',
                  marginTop: '2px',
                  cursor: 'pointer',
                }}
              >
                <span>to me</span>
                <ChevronDown size={14} color="#64748B" />
              </div>
            </div>
          </div>

          <div style={{ fontSize: '13px', color: '#94A3B8', fontWeight: 400 }}>
            {formattedDate}
          </div>
        </div>

        {/* Email Body Content */}
        <div style={{ fontSize: '14.5px', color: '#334155', lineHeight: '1.7' }}>
          <p style={{ margin: '0 0 16px 0', color: '#334155' }}>
            Hey Oliver,
          </p>

          <p style={{ margin: '0 0 18px 0', color: '#334155' }}>
            {email.body && !email.body.startsWith('Hey') ? email.body : "You've just Registered for your upcoming tennis session at the central club."}
          </p>

          {/* Yellow Callout Highlight Box */}
          <div
            style={{
              backgroundColor: '#FEF9C3',
              borderLeft: '4px solid #EAB308',
              padding: '14px 18px',
              borderRadius: '0 8px 8px 0',
              margin: '20px 0',
              color: '#1E293B',
              fontSize: '13.5px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontWeight: 600 }}>
              <span style={{ color: '#EAB308' }}>⚡</span>
              <span>Extremely fast court-side service and verified booking</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
              <span style={{ color: '#EAB308' }}>⚡</span>
              <span>To explore more training options and schedules, click here</span>
            </div>
          </div>

          <p style={{ margin: '0 0 16px 0', color: '#334155' }}>
            Your coach for this session,
          </p>

          <p style={{ margin: '0 0 20px 0', fontWeight: 600, color: '#0F172A' }}>
            Grant
          </p>

          <p style={{ margin: '0 0 28px 0', fontStyle: 'italic', color: '#64748B', fontSize: '13.5px' }}>
            P.S. Always remember to stay hydrated and warm up before match play!
          </p>

          {/* Attachment Preview Card */}
          <div style={{ marginTop: '24px' }}>
            <div
              style={{
                width: '180px',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
              }}
            >
              {/* Image thumbnail: Tennis court / racket mockup */}
              <div
                style={{
                  height: '100px',
                  backgroundColor: '#0284C7',
                  background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {/* Court lines */}
                <div
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '2px',
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    top: '50%',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    height: '100%',
                    width: '2px',
                    backgroundColor: 'rgba(255, 255, 255, 0.5)',
                    left: '50%',
                  }}
                />
                {/* Tennis ball */}
                <div
                  style={{
                    position: 'absolute',
                    top: '18px',
                    right: '22px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#CCFF00',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.6)',
                  }}
                />
                {/* Tennis Racket icon */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-8px',
                    left: '12px',
                    width: '46px',
                    height: '56px',
                    border: '3px solid #EF4444',
                    borderRadius: '50%',
                    opacity: 0.8,
                  }}
                />
              </div>

              {/* Card Bottom Meta */}
              <div style={{ padding: '10px 12px', backgroundColor: '#FFFFFF' }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#0F172A',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  Tennis_Coach_Guide.pdf
                </div>
                <div style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '2px' }}>
                  1.2 MB
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
