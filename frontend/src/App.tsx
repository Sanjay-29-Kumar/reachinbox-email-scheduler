import { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { SearchBar } from './components/SearchBar';
import { LoginPage } from './pages/LoginPage';
import { EmailListView } from './pages/EmailListView';
import { EmailDetailView } from './pages/EmailDetailView';
import { ComposeView } from './pages/ComposeView';
import {
  getCurrentUser,
  getConnectedAccounts,
  getEmailJobs,
  searchEmailJobs,
  cancelEmailJob,
  getGoogleAuthUrl,
  getHealth,
} from './services/api';
import type {
  UserProfile,
  ConnectedAccount,
  EmailJob,
  HealthStatus,
} from './services/api';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('reachinbox_token'));
  });

  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [currentView, setCurrentView] = useState<'list' | 'detail' | 'compose'>('list');
  const [selectedEmail, setSelectedEmail] = useState<EmailJob | null>(null);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [emailJobs, setEmailJobs] = useState<EmailJob[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pollIntervalRef = useRef<number | null>(null);

  // Check URL query parameters for Google OAuth callback token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      localStorage.setItem('reachinbox_token', token);
      setIsAuthenticated(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const loadBackendData = useCallback(async () => {
    try {
      const [currentUser, connectedAccs, serverEmails, healthStatus] = await Promise.all([
        getCurrentUser(),
        getConnectedAccounts(),
        getEmailJobs(),
        getHealth(),
      ]);

      if (currentUser) setUser(currentUser);
      setAccounts(connectedAccs);
      setEmailJobs(serverEmails);
      if (healthStatus) setHealth(healthStatus);
    } catch (err) {
      console.warn('Backend data load error:', err);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    if (isAuthenticated) {
      setIsLoading(true);
      loadBackendData().finally(() => setIsLoading(false));
    }
  }, [isAuthenticated, loadBackendData]);

  // Periodic Polling for Real-Time Status Transitions (Every 3s when active jobs exist)
  useEffect(() => {
    if (!isAuthenticated) return;

    const hasActiveJobs = emailJobs.some(
      (job) => job.status === 'SCHEDULED' || job.status === 'PROCESSING' || job.status === 'RETRYING'
    );

    if (hasActiveJobs || isRefreshing) {
      pollIntervalRef.current = window.setInterval(async () => {
        try {
          const freshEmails = await getEmailJobs();
          setEmailJobs(freshEmails);
          const freshHealth = await getHealth();
          if (freshHealth) setHealth(freshHealth);
        } catch (pollErr) {
          console.warn('Background poll error:', pollErr);
        }
      }, 3000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isAuthenticated, emailJobs, isRefreshing]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (searchQuery.trim()) {
        const results = await searchEmailJobs(searchQuery, activeTab.toUpperCase());
        setEmailJobs(results);
      } else {
        const emails = await getEmailJobs();
        setEmailJobs(emails);
      }
      const freshHealth = await getHealth();
      if (freshHealth) setHealth(freshHealth);
    } catch (err) {
      console.warn('Refresh error:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      const emails = await getEmailJobs();
      setEmailJobs(emails);
      return;
    }

    try {
      const searchResults = await searchEmailJobs(query);
      setEmailJobs(searchResults);
    } catch (err) {
      console.warn('Elasticsearch search error, falling back to local filter:', err);
    }
  };

  const handleCancelEmail = async (id: string) => {
    try {
      const success = await cancelEmailJob(id);
      if (success) {
        const refreshed = await getEmailJobs();
        setEmailJobs(refreshed);
      }
    } catch (err) {
      console.error('Cancel request failed:', err);
    }
  };

  const handleToggleStar = (id: string) => {
    setEmailJobs((prev) =>
      prev.map((e) => (e.id === id ? { ...e, starred: !e.starred } : e))
    );
  };

  const handleConnectGoogle = async () => {
    try {
      const url = await getGoogleAuthUrl();
      window.location.href = url;
    } catch (err) {
      console.error('Failed to get Google Auth URL:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('reachinbox_token');
    setIsAuthenticated(false);
    setCurrentView('list');
  };

  // Real Database Counts
  const scheduledEmails = emailJobs.filter(
    (e) => e.status === 'SCHEDULED' || e.status === 'PROCESSING' || e.status === 'RETRYING' || e.status === 'FAILED'
  );
  const sentEmails = emailJobs.filter((e) => e.status === 'SENT');

  const displayedEmails = (activeTab === 'scheduled' ? scheduledEmails : sentEmails).filter(
    (e) =>
      !searchQuery.trim() ||
      e.recipientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.body.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // If not logged in, render Login page (Screenshot 1)
  if (!isAuthenticated) {
    return (
      <LoginPage
        onLoginSuccess={(token, u) => {
          localStorage.setItem('reachinbox_token', token);
          if (u) setUser(u);
          setIsAuthenticated(true);
        }}
      />
    );
  }

  // If Compose view is active, render full-screen Compose View (Screenshot 5)
  if (currentView === 'compose') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
        <div style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
          <ComposeView
            onBack={() => setCurrentView('list')}
            onEmailScheduled={() => {
              setCurrentView('list');
              setActiveTab('scheduled');
              loadBackendData();
            }}
            user={user}
            accounts={accounts}
          />
        </div>
      </div>
    );
  }

  // If Detail view is active, render full-screen Email Detail View (Screenshot 4)
  if (currentView === 'detail' && selectedEmail) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
        <div style={{ flex: 1, height: '100%', overflow: 'hidden' }}>
          <EmailDetailView
            email={selectedEmail}
            onBack={() => setCurrentView('list')}
            onDelete={async (id) => {
              await cancelEmailJob(id);
              const refreshed = await getEmailJobs();
              setEmailJobs(refreshed);
              setCurrentView('list');
            }}
          />
        </div>
      </div>
    );
  }

  // Default Dashboard View with Left Sidebar (Screenshots 2 & 3)
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setCurrentView('list');
        }}
        onComposeClick={() => setCurrentView('compose')}
        user={user}
        accounts={accounts}
        scheduledCount={scheduledEmails.length}
        sentCount={sentEmails.length}
        health={health}
        onConnectGoogle={handleConnectGoogle}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header with Search Bar */}
        <div
          style={{
            padding: '20px 24px 16px 24px',
            display: 'flex',
            alignItems: 'center',
            borderBottom: '1px solid #F9FAFB',
          }}
        >
          <SearchBar
            value={searchQuery}
            onChange={handleSearch}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
        </div>

        {/* Email List Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <EmailListView
            type={activeTab}
            emails={displayedEmails}
            loading={isLoading}
            onSelectEmail={(email) => {
              setSelectedEmail(email);
              setCurrentView('detail');
            }}
            onCancelEmail={handleCancelEmail}
            onToggleStar={handleToggleStar}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
