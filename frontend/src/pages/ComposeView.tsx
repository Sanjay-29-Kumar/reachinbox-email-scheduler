import React, { useState, useRef } from 'react';
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
  Indent,
  Outdent,
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
  const defaultSenderEmail = user?.email || (accounts[0]?.email || 'oliver.brown@domain.io');

  const [fromEmail] = useState(defaultSenderEmail);
  const [recipientInput, setRecipientInput] = useState('');
  const [recipientList, setRecipientList] = useState<string[]>([
    'tame@jmail.com',
    'lame@jmail.com',
    'dame@jmail.com',
    'rame@jmail.com',
    'same@jmail.com',
    'kame@jmail.com',
    'mame@jmail.com',
  ]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [delayBetweenEmails, setDelayBetweenEmails] = useState('00');
  const [hourlyLimit, setHourlyLimit] = useState('00');

  // Attachments
  const [attachments, setAttachments] = useState<Array<{ name: string; size: string; previewUrl: string }>>([
    {
      name: 'Tennis_Coach_Profile.png',
      size: '1.2 MB',
      previewUrl: '',
    },
  ]);

  // Send Later Popover state
  const [showSendLater, setShowSendLater] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [selectedQuickPreset, setSelectedQuickPreset] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadListInputRef = useRef<HTMLInputElement>(null);

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
        setRecipientList((prev) => [...prev, trimmed]);
        setRecipientInput('');
      }
    }
  };

  const handleRemoveRecipient = (index: number) => {
    setRecipientList((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle Quick Schedule Presets
  const applyPreset = (preset: string) => {
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
          subject: subject || 'No Subject',
          body: body || '',
          scheduledAt: recipientSendTime,
        });
      }

      onEmailScheduled();
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
      }}
    >
      {/* Top Bar matching Figma exact screenshot */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid #F3F4F6',
        }}
      >
        {/* Back Arrow + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
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

          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>
            Compose New Email
          </h2>
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Paperclip Icon with Badge count 1 */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button
              title="Attach file"
              onClick={() => fileInputRef.current?.click()}
              style={{ color: '#00A859', display: 'flex', alignItems: 'center', gap: '2px' }}
            >
              <Paperclip size={19} />
              {attachments.length > 0 && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#00A859',
                    marginLeft: '-2px',
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
                    { name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`, previewUrl: '' },
                  ]);
                }
              }}
            />
          </div>

          {/* Clock Icon in green */}
          <button
            title="Send Later options"
            onClick={() => setShowSendLater(!showSendLater)}
            style={{
              color: '#00A859',
              transition: 'color 0.15s ease',
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
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
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

      {/* Main Compose Form */}
      <div style={{ padding: '24px 32px', maxWidth: '900px' }}>
        {/* From Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            marginBottom: '16px',
          }}
        >
          <span
            style={{
              width: '50px',
              fontSize: '14px',
              color: '#6B7280',
              fontWeight: 500,
            }}
          >
            From
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#F3F4F6',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '13px',
              color: '#374151',
              fontWeight: 500,
            }}
          >
            <span>{fromEmail}</span>
            <ChevronDown size={14} color="#6B7280" />
          </div>
        </div>

        {/* To Row with Upload List */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '16px',
            borderBottom: '1px solid #F3F4F6',
            paddingBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
            <span
              style={{
                width: '50px',
                fontSize: '14px',
                color: '#6B7280',
                fontWeight: 500,
                flexShrink: 0,
              }}
            >
              To
            </span>

            {/* Recipient Pills matching Screenshot 3 */}
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
                    padding: '4px 12px',
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
                    style={{ color: '#6B7280', marginLeft: '2px', display: 'flex', alignItems: 'center' }}
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
                    padding: '4px 10px',
                    fontSize: '12px',
                    color: '#111827',
                    fontWeight: 600,
                    border: '1px solid #C6EED4',
                  }}
                >
                  +{extraCount}
                </div>
              )}

              {/* Text input to type more recipients */}
              <input
                type="text"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                onKeyDown={handleAddRecipient}
                placeholder={recipientList.length === 0 ? 'recipient@example.com' : 'Add more...'}
                style={{
                  fontSize: '14px',
                  color: '#111827',
                  backgroundColor: 'transparent',
                  minWidth: '150px',
                  flex: 1,
                }}
              />
            </div>
          </div>

          {/* Upload List Button */}
          <div>
            <button
              type="button"
              onClick={() => uploadListInputRef.current?.click()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#00A859',
                padding: '4px 8px',
                borderRadius: '6px',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#E8F7EE';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Upload size={15} />
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
        </div>

        {/* Subject Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            marginBottom: '20px',
            borderBottom: '1px solid #F3F4F6',
            paddingBottom: '12px',
          }}
        >
          <span
            style={{
              width: '50px',
              fontSize: '14px',
              color: '#6B7280',
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
              color: '#111827',
              backgroundColor: 'transparent',
            }}
          />
        </div>

        {/* Numeric Limits Row (Delay & Hourly Limit) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: '#4B5563', fontWeight: 500 }}>
              Delay between 2 emails
            </span>
            <input
              type="text"
              value={delayBetweenEmails}
              onChange={(e) => setDelayBetweenEmails(e.target.value)}
              placeholder="00"
              style={{
                width: '48px',
                height: '32px',
                textAlign: 'center',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#111827',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: '#4B5563', fontWeight: 500 }}>
              Hourly Limit
            </span>
            <input
              type="text"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(e.target.value)}
              placeholder="00"
              style={{
                width: '48px',
                height: '32px',
                textAlign: 'center',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#111827',
              }}
            />
          </div>
        </div>

        {/* Rich Text Editor Container */}
        <div
          style={{
            border: '1px solid #F3F4F6',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: '#FAFAFA',
            marginBottom: '24px',
          }}
        >
          {/* Formatting Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 14px',
              borderBottom: '1px solid #F3F4F6',
              backgroundColor: '#FAFAFA',
              flexWrap: 'wrap',
              color: '#6B7280',
            }}
          >
            <button type="button" title="Undo" style={{ color: '#6B7280', padding: '4px' }}>
              <Undo size={15} />
            </button>
            <button type="button" title="Redo" style={{ color: '#6B7280', padding: '4px' }}>
              <Redo size={15} />
            </button>

            <div style={{ width: '1px', height: '16px', backgroundColor: '#E5E7EB', margin: '0 4px' }} />

            <button type="button" title="Text size" style={{ fontSize: '12px', fontWeight: 700, padding: '2px 4px' }}>
              TT ⇅
            </button>

            <div style={{ width: '1px', height: '16px', backgroundColor: '#E5E7EB', margin: '0 4px' }} />

            <button type="button" title="Bold" style={{ color: '#6B7280', padding: '4px' }}>
              <Bold size={15} />
            </button>
            <button type="button" title="Italic" style={{ color: '#6B7280', padding: '4px' }}>
              <Italic size={15} />
            </button>
            <button type="button" title="Underline" style={{ color: '#6B7280', padding: '4px' }}>
              <Underline size={15} />
            </button>

            <div style={{ width: '1px', height: '16px', backgroundColor: '#E5E7EB', margin: '0 4px' }} />

            <button type="button" title="Align Left" style={{ color: '#6B7280', padding: '4px' }}>
              <AlignLeft size={15} />
            </button>

            <button type="button" title="Numbered List" style={{ color: '#6B7280', padding: '4px' }}>
              <ListOrdered size={15} />
            </button>
            <button type="button" title="Bullet List" style={{ color: '#6B7280', padding: '4px' }}>
              <List size={15} />
            </button>
            <button type="button" title="Outdent" style={{ color: '#6B7280', padding: '4px' }}>
              <Outdent size={15} />
            </button>
            <button type="button" title="Indent" style={{ color: '#6B7280', padding: '4px' }}>
              <Indent size={15} />
            </button>
            <button type="button" title="Quote" style={{ color: '#6B7280', padding: '4px' }}>
              <Quote size={15} />
            </button>
            <button type="button" title="Link" style={{ color: '#6B7280', padding: '4px' }}>
              <Link size={15} />
            </button>
            <button type="button" title="Strikethrough" style={{ color: '#6B7280', padding: '4px' }}>
              <Strikethrough size={15} />
            </button>
          </div>

          {/* Textarea Area */}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type Your Reply..."
            rows={12}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '14px',
              color: '#111827',
              backgroundColor: '#FAFAFA',
              border: 'none',
              resize: 'vertical',
              lineHeight: '1.6',
            }}
          />
        </div>

        {/* Attachment Thumbnail Preview matching Screenshot 2 & 3 */}
        {attachments.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <div
              style={{
                width: '180px',
                height: '110px',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#0284C7',
                background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
                position: 'relative',
              }}
            >
              <span style={{ fontSize: '26px' }}>🎾</span>
              <span style={{ fontSize: '11px', fontWeight: 600, marginTop: '4px' }}>Tennis Coach Profile</span>
            </div>
          </div>
        )}
      </div>

      {/* Floating "Send Later" Popover matching Screenshot 5 */}
      {showSendLater && (
        <div
          style={{
            position: 'absolute',
            top: '70px',
            right: '24px',
            width: '260px',
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #E5E7EB',
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
              color: '#111827',
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
              borderBottom: '1px solid #F3F4F6',
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
                color: '#374151',
                backgroundColor: 'transparent',
                width: '100%',
              }}
            />
            <Calendar size={15} color="#9CA3AF" />
          </div>

          {/* Quick Presets list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
            {['Tomorrow', 'Tomorrow, 10:00 AM', 'Tomorrow, 11:00 AM', 'Tomorrow, 3:00 PM'].map(
              (preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  style={{
                    textAlign: 'left',
                    fontSize: '12.5px',
                    color: selectedQuickPreset === preset ? '#00A859' : '#4B5563',
                    fontWeight: selectedQuickPreset === preset ? 600 : 400,
                    padding: '3px 0',
                  }}
                >
                  {preset}
                </button>
              )
            )}
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '8px',
            }}
          >
            <button
              type="button"
              onClick={() => setShowSendLater(false)}
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#6B7280',
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => setShowSendLater(false)}
              style={{
                padding: '5px 16px',
                borderRadius: '9999px',
                border: '1.5px solid #00A859',
                backgroundColor: '#FFFFFF',
                color: '#00A859',
                fontSize: '12.5px',
                fontWeight: 600,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#E8F7EE';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
