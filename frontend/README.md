# ReachInbox Frontend - Email Scheduler Dashboard

A modern, responsive React dashboard built with **TypeScript**, **Vite**, and **Lucide Icons**, providing an intuitive interface for scheduling emails, managing connected accounts, full-text searching, and monitoring delivery status.

---

## 🛠 Tech Stack

- **Framework**: React 19, TypeScript
- **Build Tool**: Vite v8
- **Icons**: Lucide React
- **Styling**: Modern CSS with clean design system tokens
- **Linting**: Oxlint

---

## ✨ Features & Views

### 1. 🔐 Google OAuth & Passwordless Login (`LoginPage`)
- Pixel-perfect login card with **ONB** 8-bit grid brand typography.
- One-click **"Login with Google"** initiating OAuth 2.0 flow with automatic token exchange.
- Passwordless email fallback for local testing.

### 2. 📬 Scheduled & Sent Email Lists (`EmailListView`)
- Separate tabs for **Scheduled** and **Sent** jobs.
- Live real-time status polling (updates job state transitions every 3s).
- Direct email cancellation with BullMQ job removal.

### 3. ✉️ Rich Email Composer (`ComposeView`)
- From dropdown with connected Google account selector.
- Recipient email tagging + bulk recipient CSV/TXT list upload.
- Delay between consecutive emails (sec) and Hourly Rate Limiting configuration.
- Rich text editor toolbar (Bold, Italic, Underline, Lists, Alignment, Links, Undo/Redo).
- **"Send Later"** popover with quick time presets (*Tomorrow 10:00 AM, 11:00 AM, 3:00 PM*) or custom datetime picker.

### 4. 📄 Email Detail View (`EmailDetailView`)
- Full email inspection with recipient avatar, delivery status, and timestamps.
- Highlight callout cards and attachment preview cards.

### 5. 🔍 Real-Time Elasticsearch Search (`SearchBar`)
- Instant full-text search querying Elasticsearch `multi_match` across recipient emails, subjects, and email bodies.

---

## ⚙️ Environment Configuration

Create `.env` in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:5000
```

---

## 🚀 Running the Frontend

### 1. Install Dependencies
```powershell
npm install
```

### 2. Start Development Server
```powershell
npm run dev
```
Dashboard will be available at **`http://localhost:5173`**.

### 3. Production Build
```powershell
npm run build
npm run preview
```

---

## 📂 Component Directory Structure

```
frontend/src/
├── assets/                  # Static media assets
├── components/
│   ├── OnbLogo.tsx          # 8-bit grid pixel art brand logo component
│   ├── SearchBar.tsx        # Elasticsearch search input with debouncing
│   └── Sidebar.tsx          # Navigation sidebar with profile and health indicator
├── pages/
│   ├── ComposeView.tsx      # Email composition and scheduling screen
│   ├── EmailDetailView.tsx  # Detailed email preview screen
│   ├── EmailListView.tsx    # Scheduled & Sent email table
│   └── LoginPage.tsx        # Google OAuth and email login screen
├── services/
│   └── api.ts               # Typed REST API service connecting to backend
├── App.tsx                  # Main router, state orchestration & live polling
├── index.css                # Global CSS styles & design tokens
└── main.tsx                 # React application root
```
