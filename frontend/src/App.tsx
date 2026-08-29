import { useState, useEffect } from 'react';
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
} from './services/api';
import type {
  UserProfile,
  ConnectedAccount,
  EmailJob,
} from './services/api';

// Initial Mock Datasets matching Screenshots 2, 3, 4
const INITIAL_SCHEDULED_EMAILS: EmailJob[] = [
  {
    id: 'sched-1',
    userId: 'usr-1',
    senderId: 'snd-1',
    recipientEmail: 'john.smith@domain.io',
    subject: 'Meeting follow-up - Scheduled',
    body: 'Hi John, just wanted to follow up on our meeting yesterday and share the next action steps we discussed regarding the project launch.',
    scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 14).toISOString(),
    status: 'SCHEDULED',
    attempts: 0,
    idempotencyKey: 'idemp-sched-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    starred: false,
  },
  {
    id: 'sched-2',
    userId: 'usr-1',
    senderId: 'snd-1',
    recipientEmail: 'olive@domain.io',
    subject: "Ramit, great to meet you - you'll love it",
    body: 'Hi Olive, just wanted to follow up on our meeting and see if you had any questions regarding the proposal we sent over.',
    scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 28).toISOString(),
    status: 'SCHEDULED',
    attempts: 0,
    idempotencyKey: 'idemp-sched-2',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    starred: false,
  },
];

const INITIAL_SENT_EMAILS: EmailJob[] = [
  {
    id: 'sent-1',
    userId: 'usr-1',
    senderId: 'snd-1',
    recipientEmail: 'sarah.wilson@domain.io',
    subject: 'Re: Project Update',
    body: 'Thanks for the update, Sarah. Looks good! We are ready to proceed with the next deployment phase.',
    scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    sentAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    status: 'SENT',
    attempts: 1,
    idempotencyKey: 'idemp-sent-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    starred: false,
  },
  {
    id: 'sent-2',
    userId: 'usr-1',
    senderId: 'snd-1',
    recipientEmail: 'support@reachinbox.ai',
    subject: 'Issue with login',
    body: 'I am having trouble logging in to the dashboard with my secondary credentials. Could you please investigate?',
    scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    sentAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    status: 'SENT',
    attempts: 1,
    idempotencyKey: 'idemp-sent-2',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    starred: false,
  },
];

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('reachinbox_token'));
  });

  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [currentView, setCurrentView] = useState<'list' | 'detail' | 'compose'>('list');
  const [selectedEmail, setSelectedEmail] = useState<EmailJob | null>(INITIAL_SCHEDULED_EMAILS[0]);

  const [user, setUser] = useState<UserProfile | null>({
    id: 'usr_default',
    name: 'Oliver Brown',
    email: 'oliver.brown@domain.io',
  });

  const [accounts, setAccounts] = useState<ConnectedAccount[]>([
    {
      id: 'acc-1',
      userId: 'usr_default',
      provider: 'google',
      email: 'oliver.brown@domain.io',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  const [emailJobs, setEmailJobs] = useState<EmailJob[]>([
    ...INITIAL_SCHEDULED_EMAILS,
    ...INITIAL_SENT_EMAILS,
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check URL query parameters for Google OAuth callback token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      localStorage.setItem('reachinbox_token', token);
      setIsAuthenticated(true);
      window.history.replaceState({}, document.title, window.location.pathname);
      loadUserData();
    }
  }, []);

  const loadUserData = async () => {
    try {
      const [currentUser, connectedAccs, serverEmails] = await Promise.all([
        getCurrentUser(),
        getConnectedAccounts(),
        getEmailJobs(),
      ]);

      if (currentUser) setUser(currentUser);
      if (connectedAccs.length > 0) setAccounts(connectedAccs);
      if (serverEmails.length > 0) {
        setEmailJobs(serverEmails);
      }
    } catch (err) {
      console.warn('Failed to load initial data from server:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadUserData();
    }
  }, [isAuthenticated]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (searchQuery.trim()) {
        const results = await searchEmailJobs(searchQuery, activeTab.toUpperCase());
        setEmailJobs(results);
      } else {
        const emails = await getEmailJobs();
        if (emails.length > 0) {
          setEmailJobs(emails);
        }
      }
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
      if (emails.length > 0) setEmailJobs(emails);
      return;
    }

    try {
      const searchResults = await searchEmailJobs(query);
      if (searchResults.length > 0) {
        setEmailJobs(searchResults);
      }
    } catch (err) {
      console.warn('Search API failed, fallback to local filtering:', err);
    }
  };

  const handleCancelEmail = async (id: string) => {
    try {
      await cancelEmailJob(id);
      setEmailJobs((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: 'CANCELLED' } : e))
      );
    } catch (err) {
      console.error('Cancel failed:', err);
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

  // Filter emails for active tab and search query
  const scheduledEmails = emailJobs.filter(
    (e) => e.status === 'SCHEDULED' || e.status === 'PROCESSING' || e.status === 'RETRYING'
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
              loadUserData();
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
            onDelete={(id) => {
              setEmailJobs((prev) => prev.filter((e) => e.id !== id));
              setCurrentView('list');
            }}
          />
        </div>
      </div>
    );
  }

  // Default Dashboard View with Left Sidebar
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Left Sidebar (Screenshot 2 and 3) */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setCurrentView('list');
        }}
        onComposeClick={() => setCurrentView('compose')}
        user={user}
        accounts={accounts}
        scheduledCount={scheduledEmails.length || 12}
        sentCount={sentEmails.length || 785}
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
