# ReachInbox Backend - Distributed Email Scheduler & Processing Engine

The backend service powers the core scheduling, throttling, database persistence, full-text search, and worker execution for the ReachInbox Email Scheduler platform.

---

## 🛠 Tech Stack & Architecture

- **Runtime & Language**: Node.js, TypeScript (`tsx watch` in development, `tsc` for production)
- **Framework**: Express.js
- **Database & ORM**: PostgreSQL 16 & Prisma ORM v6
- **Queue & Delayed Jobs**: BullMQ v6 & Redis 7 (via `ioredis`)
- **Search Engine**: Elasticsearch 8.13.0
- **Email Transports**: Gmail REST API (`googleapis`), Resend HTTP API, Mock Provider
- **Observability**: Prometheus (`prom-client`), Grafana, Slack Webhook Alerting

---

## 🏗 Key Subsystems

### 1. BullMQ Email Scheduling Queue
- Queue Name: `email-scheduler`
- Delayed jobs are created with custom delays (`delay = scheduledAt - now`).
- Worker concurrency defaults to `EMAIL_WORKER_CONCURRENCY=5`.
- Jobs support exponential backoff retries (`EMAIL_MAX_ATTEMPTS=3`, `EMAIL_RETRY_DELAY=5000ms`).

### 2. Distributed Hourly Rate Limiter (Redis Lua)
- Uses an atomic Redis Lua script counter keyed by `rate_limit:{senderId}:{yyyy-MM-dd-HH}`.
- When the hourly quota is reached:
  - The job is **not marked as failed** and **does not consume a retry attempt**.
  - The job is automatically rescheduled to execute at the beginning of the next hour.
  - A Prometheus counter `emails_rate_limited_total` is incremented.

### 3. Real-Time Elasticsearch Indexing
- Index Name: `email-jobs`
- Synchronized on every state change: `SCHEDULED`, `PROCESSING`, `RETRYING`, `SENT`, `FAILED`, `CANCELLED`.
- Full-text search endpoint (`GET /api/emails/search?q=...`) queries `recipientEmail`, `subject`, and `body` using Elasticsearch `multi_match` with fuzzy matching.

### 4. Google OAuth 2.0 & Native Gmail Dispatch
- Full OAuth 2.0 flow with `https://www.googleapis.com/auth/gmail.send` scope.
- Refresh tokens are securely persisted in the `ConnectedAccount` table.
- When `EMAIL_PROVIDER=gmail`, the worker generates an RFC 2822 MIME message, encodes it in Base64URL, and dispatches via Gmail's `users.messages.send` API.

---

## ⚙️ Environment Variables

Create `.env` in the `backend/` directory:

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# PostgreSQL Database
DATABASE_URL=postgresql://reachinbox_user:reachinbox_password@localhost:5433/reachinbox

# Redis Cache & Queue
REDIS_HOST=localhost
REDIS_PORT=6379

# Elasticsearch
ELASTICSEARCH_NODE=http://localhost:9200

# Worker Settings
EMAIL_WORKER_CONCURRENCY=5
EMAIL_MAX_ATTEMPTS=3
EMAIL_RETRY_DELAY=5000
MAX_EMAILS_PER_HOUR=10

# Email Provider (gmail | resend | mock)
EMAIL_PROVIDER=gmail
RESEND_API_KEY=
EMAIL_FROM="ReachInbox Scheduler <onboarding@resend.dev>"

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
SESSION_SECRET=reachinbox_jwt_secret_key

# Slack Webhook Alerting
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

---

## 🚀 Running the Backend

### 1. Install Dependencies
```powershell
npm install
```

### 2. Database Migrations & Initial Setup
```powershell
npx prisma migrate dev
npx prisma generate
npm run seed
npm run es:index
```

### 3. Start Development Server
```powershell
npm run dev
```

### 4. Start BullMQ Worker
```powershell
npm run worker
```

---

## 🧪 Available Scripts & Automated Tests

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Express API with TypeScript watch mode |
| `npm run worker` | Starts BullMQ email processing worker |
| `npm run seed` | Seeds default User, Sender, and EmailJob records |
| `npm run es:index` | Initializes Elasticsearch `email-jobs` index and mappings |
| `npm run test:health` | Validates API, PostgreSQL, and Redis connectivity |
| `npm run test:ratelimit` | Runs rate limiting benchmark and verifies hourly rollover |
| `npm run test:es` | Tests Elasticsearch indexing and search queries |
| `npm run test:metrics` | Scrapes and asserts Prometheus metrics output |
| `npm run test:provider` | Tests Resend / Mock email provider factory |
| `npm run test:oauth` | Tests Google OAuth tokens and Gmail REST API |
| `npm run test:slack` | Tests Slack webhook alerting |
| `npm run build` | Builds TypeScript code to `dist/` |
| `npm run start` | Runs the compiled production build |

---

## 📊 Observability Endpoints

- **Health Check**: `GET http://localhost:5000/api/health`
- **Prometheus Metrics**: `GET http://localhost:5000/metrics`
  - `emails_scheduled_total`
  - `emails_sent_total`
  - `emails_failed_total`
  - `emails_retried_total`
  - `emails_cancelled_total`
  - `emails_rate_limited_total`
  - `email_processing_duration_seconds`
  - `email_queue_waiting`, `email_queue_active`, `email_queue_delayed`
