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
  const formattedDate = 'Nov 3, 10:23 AM';
  const recipientName = email.recipientEmail.split('@')[0] || 'me';

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
      {/* Top Bar matching Screenshot 4 */}
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
            {email.subject || 'Oliver, hello there! | MJWYT44 BM#52W01'}
          </h2>
        </div>

        {/* Action Icons on Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#9CA3AF' }}>
          <button title="Star" style={{ color: '#9CA3AF' }}>
            <Star size={18} />
          </button>
          <button
            title="Delete"
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
              backgroundColor: '#E5E7EB',
              overflow: 'hidden',
              marginLeft: '4px',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#9CA3AF',
                color: '#FFFFFF',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
              }}
            >
              O
            </div>
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
              A
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
                  Amanda Clark
                </span>
                <span style={{ fontSize: '13px', color: '#6B7280' }}>
                  &lt;sender@example.com&gt;
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
                <span>to {recipientName}</span>
                <ChevronDown size={14} />
              </div>
            </div>
          </div>

          <div style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500 }}>
            {formattedDate}
          </div>
        </div>

        {/* Email Message Text */}
        <div style={{ fontSize: '14.5px', color: '#1F2937', lineHeight: '1.7' }}>
          <p style={{ marginBottom: '16px' }}>Hey Oliver,</p>
          <p style={{ marginBottom: '20px' }}>You've just RECEIVED something</p>

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
              <span>Extremely Exclusive—Only 4 Spots Worldwide Per Year | $25,000 investment</span>
              <span style={{ color: '#F59E0B' }}>⚡</span>
            </div>
            <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#F59E0B' }}>⚡</span>
              <span>To explore securing your private transformation, simply reply right now with <strong>"FLY OUT FIX"</strong> .</span>
            </div>
          </div>

          <p style={{ marginBottom: '16px' }}>Your coach for world-class performance,</p>
          <p style={{ fontWeight: 600, marginBottom: '24px' }}>Grant</p>

          <p style={{ fontStyle: 'italic', color: '#4B5563', marginBottom: '32px' }}>
            P.S. Always remember that you can develop world class technique! 🚀
          </p>

          {/* Dynamic Body content if populated from API */}
          {email.body && !email.body.includes('Meeting follow-up') && (
            <div
              style={{
                marginTop: '20px',
                paddingTop: '20px',
                borderTop: '1px solid #F3F4F6',
              }}
              dangerouslySetInnerHTML={{ __html: email.body }}
            />
          )}

          {/* Attachment Cards matching Screenshot 4 */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '24px', flexWrap: 'wrap' }}>
            {/* Attachment Card 1 */}
            <div
              style={{
                width: '200px',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                cursor: 'pointer',
              }}
            >
              {/* Tennis Coach Image / Illustration */}
              <div
                style={{
                  height: '110px',
                  backgroundColor: '#0284C7',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    padding: '8px',
                    textAlign: 'center',
                  }}
                >
                  <span style={{ fontSize: '28px' }}>🎾</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, marginTop: '4px' }}>Tennis Coach Profile</span>
                </div>
              </div>
              <div style={{ padding: '10px 12px', backgroundColor: '#FFFFFF' }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#111827',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Tennis_Coach_Profile.png
                </div>
                <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                  1.2 MB
                </div>
              </div>
            </div>

            {/* Attachment Card 2 */}
            <div
              style={{
                width: '200px',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  height: '110px',
                  backgroundColor: '#0284C7',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #0369A1 0%, #075985 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    padding: '8px',
                    textAlign: 'center',
                  }}
                >
                  <span style={{ fontSize: '28px' }}>🎾</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, marginTop: '4px' }}>Tennis Coach Profile 2</span>
                </div>
              </div>
              <div style={{ padding: '10px 12px', backgroundColor: '#FFFFFF' }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#111827',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Tennis_Coach_Profile2.png
                </div>
                <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
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
