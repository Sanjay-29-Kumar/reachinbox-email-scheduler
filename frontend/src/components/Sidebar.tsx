import React, { useState } from 'react';
import { Clock, Send, ChevronDown, LogOut, CheckCircle2, Link2, Activity } from 'lucide-react';
import type { UserProfile, ConnectedAccount, HealthStatus } from '../services/api';

interface SidebarProps {
  activeTab: 'scheduled' | 'sent';
  onTabChange: (tab: 'scheduled' | 'sent') => void;
  onComposeClick: () => void;
  user: UserProfile | null;
  accounts: ConnectedAccount[];
  scheduledCount: number;
  sentCount: number;
  health: HealthStatus | null;
  onConnectGoogle: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onComposeClick,
  user,
  accounts,
  scheduledCount,
  sentCount,
  health,
  onConnectGoogle,
  onLogout,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const userName = user?.name || 'Oliver Brown';
  const userEmail = user?.email || (accounts[0]?.email || 'oliver.brown@domain.io');
  const userAvatar = user?.avatarUrl;

  const isHealthy = health?.status === 'ok' || (health?.database === 'connected' && health?.redis === 'connected');

  return (
    <aside
      style={{
        width: '260px',
        minWidth: '260px',
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid #F3F4F6',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        userSelect: 'none',
      }}
    >
      {/* ONB Brand Logo */}
      <div style={{ marginBottom: '28px', paddingLeft: '8px' }}>
        <div
          style={{
            fontSize: '28px',
            fontWeight: 900,
            letterSpacing: '-1px',
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          ONB
        </div>
      </div>

      {/* User Profile Pill Card */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <div
          onClick={() => setShowUserMenu(!showUserMenu)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#F3F4F6',
            borderRadius: '16px',
            padding: '8px 12px',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#E5E7EB',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#D1D5DB',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* User Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#111827',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {userName}
            </div>
            <div
              style={{
                fontSize: '11px',
                color: '#6B7280',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {userEmail}
            </div>
          </div>

          {/* Chevron */}
          <ChevronDown size={16} color="#6B7280" />
        </div>

        {/* User Popover Menu */}
        {showUserMenu && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '0',
              right: '0',
              marginTop: '6px',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
              border: '1px solid #E5E7EB',
              padding: '8px',
              zIndex: 50,
            }}
          >
            <div style={{ padding: '6px 8px', fontSize: '11px', fontWeight: 600, color: '#9CA3AF' }}>
              CONNECTED ACCOUNTS ({accounts.length})
            </div>
            {accounts.length === 0 ? (
              <div style={{ padding: '4px 8px', fontSize: '11px', color: '#9CA3AF' }}>
                No Gmail accounts connected
              </div>
            ) : (
              accounts.map((acc) => (
                <div
                  key={acc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 8px',
                    fontSize: '12px',
                    color: '#374151',
                  }}
                >
                  <CheckCircle2 size={14} color="#00A859" />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {acc.email}
                  </span>
                </div>
              ))
            )}
            <div style={{ height: '1px', backgroundColor: '#F3F4F6', margin: '4px 0' }} />
            <button
              onClick={() => {
                setShowUserMenu(false);
                onConnectGoogle();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px',
                fontSize: '12px',
                color: '#00A859',
                fontWeight: 500,
                borderRadius: '6px',
                textAlign: 'left',
              }}
            >
              <Link2 size={14} />
              Connect Google / Gmail
            </button>
            <button
              onClick={() => {
                setShowUserMenu(false);
                onLogout();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px',
                fontSize: '12px',
                color: '#EF4444',
                fontWeight: 500,
                borderRadius: '6px',
                textAlign: 'left',
              }}
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Compose Button */}
      <button
        onClick={onComposeClick}
        style={{
          width: '100%',
          height: '42px',
          borderRadius: '9999px',
          border: '1.5px solid #00A859',
          backgroundColor: '#FFFFFF',
          color: '#00A859',
          fontSize: '14px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '28px',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.02)',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#E8F7EE';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#FFFFFF';
        }}
      >
        Compose
      </button>

      {/* CORE Navigation Section */}
      <div style={{ marginBottom: '8px', paddingLeft: '12px' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#9CA3AF',
            letterSpacing: '0.5px',
          }}
        >
          CORE
        </span>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        {/* Scheduled Nav Item */}
        <div
          onClick={() => onTabChange('scheduled')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: '9999px',
            cursor: 'pointer',
            backgroundColor: activeTab === 'scheduled' ? '#E8F7EE' : 'transparent',
            color: activeTab === 'scheduled' ? '#111827' : '#4B5563',
            fontWeight: activeTab === 'scheduled' ? 600 : 500,
            fontSize: '14px',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (activeTab !== 'scheduled') {
              e.currentTarget.style.backgroundColor = '#F9FAFB';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'scheduled') {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={18} color={activeTab === 'scheduled' ? '#111827' : '#6B7280'} />
            <span>Scheduled</span>
          </div>
          <span
            style={{
              fontSize: '13px',
              color: '#6B7280',
              fontWeight: 500,
            }}
          >
            {scheduledCount}
          </span>
        </div>

        {/* Sent Nav Item */}
        <div
          onClick={() => onTabChange('sent')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: '9999px',
            cursor: 'pointer',
            backgroundColor: activeTab === 'sent' ? '#E8F7EE' : 'transparent',
            color: activeTab === 'sent' ? '#111827' : '#4B5563',
            fontWeight: activeTab === 'sent' ? 600 : 500,
            fontSize: '14px',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (activeTab !== 'sent') {
              e.currentTarget.style.backgroundColor = '#F9FAFB';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'sent') {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Send size={18} color={activeTab === 'sent' ? '#111827' : '#6B7280'} />
            <span>Sent</span>
          </div>
          <span
            style={{
              fontSize: '13px',
              color: '#6B7280',
              fontWeight: 500,
            }}
          >
            {sentCount}
          </span>
        </div>
      </nav>

      {/* System Health Status Footer */}
      <div
        style={{
          borderTop: '1px solid #F3F4F6',
          paddingTop: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#6B7280' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={12} color={isHealthy ? '#00A859' : '#EF4444'} />
            <span>System Health</span>
          </div>
          <span style={{ fontWeight: 600, color: isHealthy ? '#00A859' : '#EF4444' }}>
            {isHealthy ? 'Online' : 'Degraded'}
          </span>
        </div>
        {health && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#9CA3AF' }}>
            <span>DB: {health.database}</span>
            <span>Redis: {health.redis}</span>
            <span>ES: {health.elasticsearch}</span>
          </div>
        )}
      </div>
    </aside>
  );
};
