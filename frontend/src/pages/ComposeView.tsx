import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  Paperclip,
  Clock,
  ChevronDown,
  Calendar,
  Upload,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  List,
  ListOrdered,
  Quote,
  Link,
  Strikethrough,
  X,
} from 'lucide-react';
import { scheduleEmail } from '../services/api';
import type { UserProfile, ConnectedAccount } from '../services/api';

interface ComposeViewProps {
  onBack: () => void;
  onEmailScheduled: () => void;
  user: UserProfile | null;
  accounts: ConnectedAccount[];
}

export const ComposeView: React.FC<ComposeViewProps> = ({
  onBack,
  onEmailScheduled,
  user,
  accounts,
}) => {
  const initialFrom = accounts[0]?.email || user?.email || 'oliver.brown@domain.io';

  const [fromEmail, setFromEmail] = useState(initialFrom);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [recipientInput, setRecipientInput] = useState('');
  const [recipientList, setRecipientList] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [delayBetweenEmails, setDelayBetweenEmails] = useState('00');
  const [hourlyLimit, setHourlyLimit] = useState('00');

  // Attachments
  const [attachments, setAttachments] = useState<Array<{ name: string; size: string }>>([]);

  // Send Later Popover state
  const [showSendLater, setShowSendLater] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [selectedQuickPreset, setSelectedQuickPreset] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadListInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (accounts.length > 0 && !fromEmail) {
      setFromEmail(accounts[0].email);
    } else if (user?.email && !fromEmail) {
      setFromEmail(user.email);
    }
  }, [accounts, user, fromEmail]);

  // Handle CSV / TXT list upload
  const handleUploadList = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const emails = text
        .split(/[\r\n,;]+/)
        .map((email) => email.trim())
        .filter((email) => email.includes('@') && email.length > 3);

      if (emails.length > 0) {
        setRecipientList((prev) => Array.from(new Set([...prev, ...emails])));
      }
    };
    reader.readAsText(file);
  };

  const handleAddRecipient = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = recipientInput.trim().replace(/,/g, '');
      if (trimmed && trimmed.includes('@')) {
        setRecipientList((prev) => Array.from(new Set([...prev, trimmed])));
        setRecipientInput('');
      }
    }
  };

  const handleRemoveRecipient = (index: number) => {
    setRecipientList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    const allRecipients = [...recipientList];
    if (recipientInput.trim() && recipientInput.includes('@')) {
      allRecipients.push(recipientInput.trim());
    }

    if (allRecipients.length === 0) {
      setErrorMessage('Please specify at least one recipient email.');
      return;
    }

    if (!subject.trim()) {
      setErrorMessage('Please enter an email subject.');
      return;
    }

    if (!body.trim()) {
      setErrorMessage('Please enter email body content.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      let sendTime = scheduledDateTime
        ? new Date(scheduledDateTime).toISOString()
        : new Date(Date.now() + 60 * 1000).toISOString();

      for (let i = 0; i < allRecipients.length; i++) {
        const recipient = allRecipients[i];
        const delaySec = parseInt(delayBetweenEmails, 10) || 0;
        const recipientSendTime = new Date(new Date(sendTime).getTime() + i * delaySec * 1000).toISOString();

        await scheduleEmail({
          recipientEmail: recipient,
          subject: subject.trim(),
          body: body.trim(),
          scheduledAt: recipientSendTime,
        });
      }

      setSuccessMessage('Email scheduled successfully!');
      setTimeout(() => {
        onEmailScheduled();
      }, 600);
    } catch (err: any) {
      console.error('Failed to send email:', err);
      setErrorMessage(err?.message || 'Failed to schedule email');
    } finally {
      setIsSubmitting(false);
    }
  };

  const visibleRecipients = recipientList.slice(0, 3);
  const extraCount = recipientList.length > 3 ? recipientList.length - 3 : 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#FFFFFF',
        position: 'relative',
        overflowY: 'auto',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Top Bar matching Exact Screenshot */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 28px',
          borderBottom: '1px solid #F1F5F9',
        }}
      >
        {/* Back Arrow + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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

          <h2 style={{ fontSize: '19px', fontWeight: 600, color: '#0F172A', letterSpacing: '-0.2px' }}>
            Compose New Email
          </h2>
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Paperclip Icon */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button
              title="Attach file"
              onClick={() => fileInputRef.current?.click()}
              style={{ color: '#00A859', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            >
              <Paperclip size={19} />
              {attachments.length > 0 && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#00A859',
                    marginLeft: '2px',
                  }}
                >
                  {attachments.length}
                </span>
              )}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setAttachments((prev) => [
                    ...prev,
                    { name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(1)} MB` },
                  ]);
                }
              }}
            />
          </div>

          {/* Clock Icon */}
          <button
            title="Schedule options"
            onClick={() => setShowSendLater(!showSendLater)}
            style={{
              color: '#00A859',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Clock size={19} />
          </button>

          {/* Send Later Pill Button */}
          <button
            onClick={handleSend}
            disabled={isSubmitting}
            style={{
              height: '34px',
              padding: '0 18px',
              borderRadius: '9999px',
              border: '1.5px solid #00A859',
              backgroundColor: '#FFFFFF',
              color: '#00A859',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              opacity: isSubmitting ? 0.6 : 1,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#E8F7EE';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
          >
            {isSubmitting ? 'Scheduling...' : 'Send Later'}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div
          style={{
            margin: '12px 32px 0 32px',
            padding: '10px 16px',
            backgroundColor: '#FEE2E2',
            color: '#B91C1C',
            fontSize: '13px',
            borderRadius: '8px',
          }}
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          style={{
            margin: '12px 32px 0 32px',
            padding: '10px 16px',
            backgroundColor: '#DCFCE7',
            color: '#15803D',
            fontSize: '13px',
            borderRadius: '8px',
          }}
        >
          {successMessage}
        </div>
      )}

      {/* Main Compose Form */}
      <div style={{ padding: '28px 48px', maxWidth: '880px' }}>
        {/* From Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '28px',
            marginBottom: '20px',
            position: 'relative',
          }}
        >
          <span
            style={{
              width: '60px',
              fontSize: '14px',
              color: '#334155',
              fontWeight: 500,
            }}
          >
            From
          </span>
          <div
            onClick={() => setShowFromDropdown(!showFromDropdown)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#F1F5F9',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '13.5px',
              color: '#1E293B',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E2E8F0')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
          >
            <span>{fromEmail || 'oliver.brown@domain.io'}</span>
            <ChevronDown size={14} color="#64748B" />
          </div>

          {showFromDropdown && accounts.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: '88px',
                marginTop: '4px',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                border: '1px solid #E2E8F0',
                padding: '4px',
                zIndex: 30,
              }}
            >
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  onClick={() => {
                    setFromEmail(acc.email);
                    setShowFromDropdown(false);
                  }}
                  style={{
                    padding: '8px 14px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    color: '#1E293B',
                    borderRadius: '6px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {acc.email}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* To Row with Underline */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '28px',
            marginBottom: '20px',
            borderBottom: '1px solid #F1F5F9',
            paddingBottom: '12px',
          }}
        >
          <span
            style={{
              width: '60px',
              fontSize: '14px',
              color: '#334155',
              fontWeight: 500,
              flexShrink: 0,
            }}
          >
            To
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
            {visibleRecipients.map((rec, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#E8F7EE',
                  borderRadius: '9999px',
                  padding: '3px 10px',
                  fontSize: '13px',
                  color: '#111827',
                  fontWeight: 500,
                  border: '1px solid #C6EED4',
                }}
              >
                <span>{rec}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveRecipient(idx)}
                  style={{ color: '#6B7280', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}

            {extraCount > 0 && (
              <div
                style={{
                  backgroundColor: '#E8F7EE',
                  borderRadius: '9999px',
                  padding: '3px 8px',
                  fontSize: '12px',
                  color: '#111827',
                  fontWeight: 600,
                  border: '1px solid #C6EED4',
                }}
              >
                +{extraCount}
              </div>
            )}

            <input
              type="email"
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              onKeyDown={handleAddRecipient}
              placeholder="recipient@example.com"
              style={{
                fontSize: '14px',
                color: '#1E293B',
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                minWidth: '220px',
                flex: 1,
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => uploadListInputRef.current?.click()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#00A859',
              padding: '4px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            <Upload size={14} />
            <span>Upload List</span>
          </button>
          <input
            type="file"
            ref={uploadListInputRef}
            accept=".csv,.txt"
            style={{ display: 'none' }}
            onChange={handleUploadList}
          />
        </div>

        {/* Subject Row with Underline */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '28px',
            marginBottom: '24px',
            borderBottom: '1px solid #F1F5F9',
            paddingBottom: '12px',
          }}
        >
          <span
            style={{
              width: '60px',
              fontSize: '14px',
              color: '#334155',
              fontWeight: 500,
            }}
          >
            Subject
          </span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            style={{
              flex: 1,
              fontSize: '14px',
              color: '#1E293B',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
            }}
          />
        </div>

        {/* Numeric Limits Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '36px',
            marginBottom: '28px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '13.5px', color: '#334155', fontWeight: 500 }}>
              Delay between 2 emails
            </span>
            <input
              type="text"
              value={delayBetweenEmails}
              onChange={(e) => setDelayBetweenEmails(e.target.value)}
              placeholder="00"
              style={{
                width: '56px',
                height: '34px',
                textAlign: 'center',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '13.5px',
                color: '#334155',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '13.5px', color: '#334155', fontWeight: 500 }}>
              Hourly Limit
            </span>
            <input
              type="text"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(e.target.value)}
              placeholder="00"
              style={{
                width: '56px',
                height: '34px',
                textAlign: 'center',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '13.5px',
                color: '#334155',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Email Body & Editor Container matching Screenshot */}
        <div
          style={{
            border: '1px solid #F1F5F9',
            borderRadius: '14px',
            overflow: 'hidden',
            backgroundColor: '#F8FAFC',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          }}
        >
          {/* Main Text Input Area */}
          <div style={{ padding: '18px 20px 10px 20px' }}>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type Your Reply..."
              rows={8}
              style={{
                width: '100%',
                fontSize: '14px',
                color: '#1E293B',
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'vertical',
                lineHeight: '1.6',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Bottom Formatting Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderTop: '1px solid #F1F5F9',
              backgroundColor: '#FFFFFF',
              flexWrap: 'wrap',
              color: '#64748B',
            }}
          >
            <button type="button" title="Undo" style={{ color: '#64748B', padding: '4px', cursor: 'pointer' }}>
              <Undo size={16} />
            </button>
            <button type="button" title="Redo" style={{ color: '#64748B', padding: '4px', cursor: 'pointer' }}>
              <Redo size={16} />
            </button>

            <div style={{ width: '1px', height: '18px', backgroundColor: '#E2E8F0', margin: '0 4px' }} />

            {/* Font Size indicator */}
            <button
              type="button"
              title="Text size"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#64748B',
                padding: '2px 6px',
                cursor: 'pointer',
              }}
            >
              <span>TT</span>
              <span style={{ fontSize: '11px' }}>⇅</span>
            </button>

            <div style={{ width: '1px', height: '18px', backgroundColor: '#E2E8F0', margin: '0 4px' }} />

            <button type="button" title="Bold" style={{ color: '#64748B', padding: '4px', cursor: 'pointer' }}>
              <Bold size={16} />
            </button>
            <button type="button" title="Italic" style={{ color: '#64748B', padding: '4px', cursor: 'pointer' }}>
              <Italic size={16} />
            </button>
            <button type="button" title="Underline" style={{ color: '#64748B', padding: '4px', cursor: 'pointer' }}>
              <Underline size={16} />
            </button>

            <div style={{ width: '1px', height: '18px', backgroundColor: '#E2E8F0', margin: '0 4px' }} />

            <button
              type="button"
              title="Text Alignment"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                color: '#64748B',
                padding: '4px',
                cursor: 'pointer',
              }}
            >
              <AlignLeft size={16} />
              <span style={{ fontSize: '11px' }}>⇅</span>
            </button>

            <div style={{ width: '1px', height: '18px', backgroundColor: '#E2E8F0', margin: '0 4px' }} />

            <button type="button" title="Numbered List" style={{ color: '#64748B', padding: '4px', cursor: 'pointer' }}>
              <ListOrdered size={16} />
            </button>
            <button type="button" title="Bullet List" style={{ color: '#64748B', padding: '4px', cursor: 'pointer' }}>
              <List size={16} />
            </button>
            <button type="button" title="Quote" style={{ color: '#64748B', padding: '4px', cursor: 'pointer' }}>
              <Quote size={16} />
            </button>
            <button type="button" title="Link" style={{ color: '#64748B', padding: '4px', cursor: 'pointer' }}>
              <Link size={16} />
            </button>
            <button type="button" title="Strikethrough" style={{ color: '#64748B', padding: '4px', cursor: 'pointer' }}>
              <Strikethrough size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Floating "Send Later" Popover */}
      {showSendLater && (
        <div
          style={{
            position: 'absolute',
            top: '70px',
            right: '28px',
            width: '260px',
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.12), 0 4px 8px -2px rgba(0, 0, 0, 0.04)',
            padding: '18px 16px',
            zIndex: 40,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#0F172A',
              marginBottom: '14px',
            }}
          >
            Send Later
          </div>

          {/* Date & Time Picker */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #F1F5F9',
              paddingBottom: '12px',
              marginBottom: '14px',
            }}
          >
            <input
              type="datetime-local"
              value={scheduledDateTime}
              onChange={(e) => {
                setScheduledDateTime(e.target.value);
                setSelectedQuickPreset(null);
              }}
              style={{
                fontSize: '12.5px',
                color: '#334155',
                backgroundColor: 'transparent',
                width: '100%',
                border: 'none',
                outline: 'none',
              }}
            />
            <Calendar size={15} color="#94A3B8" />
          </div>

          {/* Quick Presets list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
            {['Tomorrow', 'Tomorrow, 10:00 AM', 'Tomorrow, 11:00 AM', 'Tomorrow, 3:00 PM'].map(
              (preset) => (
                <div
                  key={preset}
                  onClick={() => {
                    setSelectedQuickPreset(preset);
                    const now = new Date();
                    const target = new Date(now);
                    if (preset === 'Tomorrow') {
                      target.setDate(target.getDate() + 1);
                      target.setHours(9, 0, 0, 0);
                    } else if (preset === 'Tomorrow, 10:00 AM') {
                      target.setDate(target.getDate() + 1);
                      target.setHours(10, 0, 0, 0);
                    } else if (preset === 'Tomorrow, 11:00 AM') {
                      target.setDate(target.getDate() + 1);
                      target.setHours(11, 0, 0, 0);
                    } else if (preset === 'Tomorrow, 3:00 PM') {
                      target.setDate(target.getDate() + 1);
                      target.setHours(15, 0, 0, 0);
                    }
                    setScheduledDateTime(target.toISOString().slice(0, 16));
                  }}
                  style={{
                    fontSize: '13px',
                    color: selectedQuickPreset === preset ? '#00A859' : '#334155',
                    fontWeight: selectedQuickPreset === preset ? 600 : 400,
                    cursor: 'pointer',
                    padding: '4px 6px',
                    borderRadius: '6px',
                    backgroundColor: selectedQuickPreset === preset ? '#E8F7EE' : 'transparent',
                  }}
                >
                  {preset}
                </div>
              )
            )}
          </div>

          {/* Schedule Confirmation Action Button */}
          <button
            onClick={() => setShowSendLater(false)}
            style={{
              width: '100%',
              height: '36px',
              backgroundColor: '#00A859',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
};
