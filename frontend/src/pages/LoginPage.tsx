import React, { useState } from 'react';
import { getGoogleAuthUrl } from '../services/api';

interface LoginPageProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const url = await getGoogleAuthUrl();
      window.location.href = url;
    } catch (err) {
      console.error('Failed to initiate Google login:', err);
      setLoading(false);
    }
  };

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    // Fast mock login for direct passwordless email flow in development
    const mockToken = `token_${Date.now()}`;
    localStorage.setItem('reachinbox_token', mockToken);
    onLoginSuccess(mockToken, {
      id: 'usr_default',
      email: email,
      name: email.split('@')[0] || 'User',
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: '#FFFFFF',
        padding: '20px',
      }}
    >
      {/* Centered Login Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #F3F4F6',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
          padding: '40px 36px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Title */}
        <h1
          style={{
            fontSize: '26px',
            fontWeight: 700,
            color: '#111827',
            marginBottom: '28px',
          }}
        >
          Login
        </h1>

        {/* Login with Google Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: '100%',
            height: '44px',
            backgroundColor: '#E8F7EE',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: 500,
            color: '#111827',
            marginBottom: '24px',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#DCF5E5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#E8F7EE';
          }}
        >
          {/* Google "G" SVG Icon */}
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Login with Google</span>
        </button>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            marginBottom: '24px',
          }}
        >
          <div style={{ flex: 1, height: '1px', backgroundColor: '#F3F4F6' }} />
          <span
            style={{
              padding: '0 12px',
              fontSize: '12px',
              color: '#9CA3AF',
              fontWeight: 400,
            }}
          >
            or sign up through email
          </span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#F3F4F6' }} />
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailLogin} style={{ width: '100%' }}>
          <div style={{ marginBottom: '14px' }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email ID"
              style={{
                width: '100%',
                height: '44px',
                backgroundColor: '#F3F4F6',
                borderRadius: '10px',
                padding: '0 16px',
                fontSize: '14px',
                color: '#111827',
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              style={{
                width: '100%',
                height: '44px',
                backgroundColor: '#F3F4F6',
                borderRadius: '10px',
                padding: '0 16px',
                fontSize: '14px',
                color: '#111827',
              }}
            />
          </div>

          {/* Login Button */}
          <button
            type="submit"
            style={{
              width: '100%',
              height: '44px',
              backgroundColor: '#00A859',
              color: '#FFFFFF',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#00934c';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#00A859';
            }}
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};
