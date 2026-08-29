# ReachInbox Email Scheduler - Project Status & Roadmap

> **Single Source of Truth for Project Progress**  
> *Last Updated: August 29, 2026*

---

## 1. Project Overview

**ReachInbox Email Scheduler** is a full-stack email scheduling and management system. It allows users to schedule, queue, throttle, monitor, and search emails using a scalable microservice-ready backend architecture powered by Node.js, Express, PostgreSQL, Redis, BullMQ, and Elasticsearch.

---

## 2. Current Tech Stack

- **Backend Framework**: Express.js with TypeScript (`tsx watch` / Node.js)
- **Database & ORM**: PostgreSQL 16 (running on Docker port `5433:5432`) & Prisma ORM v6.19.3
- **Job Queue & Cache**: BullMQ v6.3.1 & Redis 7 (ioredis v6.0.0, running on Docker port `6379:6379`)
- **Search Engine**: Elasticsearch 8.13.0 (running on Docker port `9200:9200`)
- **Email Transport**: Nodemailer v6.10.0 (SMTP with automated Ethereal Email test account fallback)
- **Containerization**: Docker & Docker Compose
- **Type Checking**: TypeScript v5.9.3 (`npx tsc --noEmit` code 0 clean)

---

## 3. Complete Module Checklist

| Module # | Module Name | Status | Details |
| :--- | :--- | :--- | :--- |
| **Module 1** | **Infrastructure & Database Setup** | **COMPLETED & COMMITTED** | Docker Compose setup, PostgreSQL, Redis, Elasticsearch, Prisma models (`User`, `Sender`, `EmailJob`), Health APIs. |
| **Module 2** | **Core Email Scheduling (BullMQ + Redis)** | **COMPLETED & COMMITTED** | Idempotent email job creation, BullMQ `email-scheduler` queue, delayed jobs, `/api/emails/schedule`, `/api/emails`, worker orchestration, seed script. |
| **Module 3** | **Real Email Sending (Nodemailer + SMTP)** | **COMPLETED & COMMITTED** | Nodemailer transport with SMTP environment config, auto-Ethereal fallback, worker integration, `sentAt` timestamping. |
| **Module 4** | **Retry & Failure Handling** | **COMPLETED & COMMITTED** | BullMQ attempts (`EMAIL_MAX_ATTEMPTS=3`), exponential backoff (`EMAIL_RETRY_DELAY=5000`), DB fields `attempts` & `lastError`, `RETRYING` state, `FAILED` state fallback. |
| **Module 5** | **Cancel Scheduled Emails** | **COMPLETED (UNCOMMITTED)** | `CANCELLED` status, `cancelEmailJob` service, `DELETE /api/emails/:id` endpoint, BullMQ queue job removal, worker safety guard. |
| **Module 6** | **Hourly Rate Limiting** | **COMPLETED (UNCOMMITTED)** | Redis-backed distributed hourly counter per sender (`rate_limit:{senderId}:{yyyy-MM-dd-HH}`), atomic Lua script counter, BullMQ job rescheduling to start of next hour without consuming retries or setting `FAILED`. |
| **Module 7** | **Elasticsearch Indexing & Search API** | **COMPLETED (UNCOMMITTED)** | Real-time Elasticsearch indexing (`email-jobs`), explicit field mappings, full-text multi-match search API (`GET /api/emails/search`), reindex script (`npm run es:index`), safe async sync across all email job state transitions. |
| **Module 8** | **Observability & Metrics** | **COMPLETED (UNCOMMITTED)** | `prom-client` integration, Prometheus counters (`emails_scheduled_total`, `emails_sent_total`, `emails_failed_total`, `emails_retried_total`, `emails_cancelled_total`, `emails_rate_limited_total`), histogram `email_processing_duration_seconds`, BullMQ queue gauges (`email_queue_waiting`, `email_queue_active`, `email_queue_delayed`), `GET /metrics` endpoint, error isolation. |
| **Module 9** | **Production Email Provider (Resend & Nodemailer Removal)** | **COMPLETED (UNCOMMITTED)** | Completely removed Nodemailer & Ethereal dependencies (0 references). Finalized `EmailProvider` interface & `getEmailProvider()` factory defaulting to `ResendEmailProvider` (HTTP `fetch`) and `MockEmailProvider` for testing. |
| **Module 10** | **Bull Board Admin Dashboard** | **NOT STARTED** | Bull Board UI integration for monitoring Redis queues and job lifecycles. |
| **Module 11** | **React Frontend Dashboard** | **NOT STARTED** | React + TypeScript + Tailwind CSS dashboard UI for composition, CSV/TXT upload, status tracking, search. |
| **Module 12** | **Deployment & End-to-End Verification** | **NOT STARTED** | Production build optimization, Docker deployment, live load verification. |

---

## 4. Module Details

### Module 1: Infrastructure & Database Setup
- **Status**: **COMPLETED & COMMITTED**
- **What Was Implemented**: Docker Compose configuration for PostgreSQL, Redis, and Elasticsearch. Prisma schema setup with `User`, `Sender`, and `EmailJob` models. API health endpoints.
- **Files Created/Modified**: `docker-compose.yml`, `backend/prisma/schema.prisma`, `backend/src/app.ts`, `backend/src/server.ts`, `backend/src/lib/prisma.ts`.
- **APIs Added**: `GET /api/health`, `GET /api/db-health`.
- **Database Changes**: Initial Prisma migration `20260828103541_init`.
- **Tests Performed**: HTTP GET requests to `/api/health` and `/api/db-health`.
- **Git Commit**: `d2bdb0c` (*added Redis and Elasticsearch infrastructure with workflows*).

---

### Module 2: Core Email Scheduling (BullMQ + Redis)
- **Status**: **COMPLETED & COMMITTED**
- **What Was Implemented**: BullMQ queue connection module, idempotent email scheduling service, delayed job scheduling in Redis, email listing endpoint, worker process with concurrency control, database seed script.
- **Files Created/Modified**: `backend/src/lib/redis.ts`, `backend/src/queues/email.queue.ts`, `backend/src/services/email.service.ts`, `backend/src/controllers/email.controller.ts`, `backend/src/routes/email.routes.ts`, `backend/src/workers/email.worker.ts`, `backend/src/scripts/seed.ts`.
- **APIs Added**: `POST /api/emails/schedule`, `GET /api/emails`.
- **Database Changes**: Schema update adding `EmailJobStatus` enum (`SCHEDULED`, `PROCESSING`, `SENT`, `FAILED`) in migration `20260828114905_add_email_job_status_enum`.
- **Tests Performed**: Idempotency check with duplicate POST payloads, delayed scheduling verification.
- **Git Commits**: `662cf1e`, `4a91f40`.

---

### Module 3: Real Email Sending (Nodemailer + SMTP)
- **Status**: **COMPLETED & COMMITTED**
- **What Was Implemented**: Nodemailer transport integration reading `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. Automated Ethereal test account generation when credentials are omitted. Worker updated to send real emails and set `sentAt`.
- **Files Created/Modified**: `backend/src/lib/email.ts`, `backend/src/workers/email.worker.ts`, `backend/.env`, `backend/.env.example`, `backend/package.json`.
- **APIs Added**: N/A (worker integration).
- **Database Changes**: N/A.
- **Tests Performed**: End-to-end send test producing real Ethereal `MessageId` and online message preview URLs.
- **Git Commit**: `7d0df8c` (*implement email worker and Nodemailer transport with Ethereal fallback for production-ready SMTP delivery*).

---

### Module 4: Retry & Failure Handling
- **Status**: **COMPLETED & COMMITTED**
- **What Was Implemented**: Configured BullMQ retry options (`attempts: EMAIL_MAX_ATTEMPTS`, `backoff: { type: 'exponential', delay: EMAIL_RETRY_DELAY }`). Added `attempts` count and sanitized `lastError` fields to `EmailJob`. Worker logic updated to transition through `RETRYING` status before setting final `FAILED` status.
- **Files Created/Modified**: `backend/prisma/schema.prisma`, `backend/src/services/email.service.ts`, `backend/src/workers/email.worker.ts`, `backend/.env`, `backend/.env.example`.
- **APIs Added**: N/A.
- **Database Changes**: Applied migration `20260828131142_add_retry_fields` adding `RETRYING` enum value and `attempts` (Int) & `lastError` (Text) fields to `EmailJob`.
- **Tests Performed**: Successful send (1 attempt), forced SMTP connection failure (3 attempts with exponential backoff resulting in `status: FAILED`, `attempts: 3`, `lastError` recorded).
- **Git Commit**: `cd50822` (*add email retry and failure handling*).

---

### Module 5: Cancel Scheduled Emails
- **Status**: **COMPLETED (UNCOMMITTED)**
- **What Was Implemented**: Added `CANCELLED` status to `EmailJobStatus`. Created `cancelEmailJob(id)` service method which removes delayed jobs from BullMQ queue and updates PostgreSQL status to `CANCELLED`. Added `DELETE /api/emails/:id` endpoint. Added worker safety guard skipping cancelled jobs.
- **Files Created/Modified**: `backend/prisma/schema.prisma`, `backend/prisma/migrations/20260828132114_add_cancelled_email_status/`, `backend/src/services/email.service.ts`, `backend/src/controllers/email.controller.ts`, `backend/src/routes/email.routes.ts`, `backend/src/workers/email.worker.ts`, `workflow.txt`.
- **APIs Added**: `DELETE /api/emails/:id`.
- **Database Changes**: Migration `20260828132114_add_cancelled_email_status` adding `CANCELLED` to `EmailJobStatus` enum.
- **Tests Performed**: Scheduled email cancelled prior to execution, verified BullMQ job removal, verified DB status updated to `CANCELLED`, verified worker skipped cancelled job, verified edge case HTTP codes (404 for non-existent, 400 for already CANCELLED/SENT).
- **Git Commit**: *Not committed yet (uncommitted local changes)*.

---

## 5. Current Database / Schema State

### Prisma Schema (`backend/prisma/schema.prisma`)
```prisma
enum EmailJobStatus {
  SCHEDULED
  PROCESSING
  RETRYING
  SENT
  FAILED
  CANCELLED
}

model User {
  id        String   @id @default(uuid())
  googleId  String?  @unique
  email     String   @unique
  name      String
  avatarUrl String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  senders   Sender[]
  emailJobs EmailJob[]
}

model Sender {
  id        String   @id @default(uuid())
  userId    String
  email     String
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  emailJobs EmailJob[]
}

model EmailJob {
  id             String         @id @default(uuid())
  userId         String
  senderId       String
  recipientEmail String
  subject        String
  body           String         @db.Text
  scheduledAt    DateTime
  sentAt         DateTime?
  status         EmailJobStatus @default(SCHEDULED)
  attempts       Int            @default(0)
  lastError      String?        @db.Text
  idempotencyKey String         @unique
  bullJobId      String?        @unique
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  sender Sender @relation(fields: [senderId], references: [id], onDelete: Cascade)
}
```

---

## 6. Current API Endpoints

| Method | Endpoint | Description | Status Code |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Backend API liveness check | `200` |
| `GET` | `/api/db-health` | PostgreSQL database connection query test | `200` / `500` |
| `POST` | `/api/emails/schedule` | Schedule email job with input validation, idempotency, DB insertion, & BullMQ delay | `201` (Created) / `200` (Idempotent Return) / `400` (Validation Error) |
| `GET` | `/api/emails` | List all email jobs sorted by `scheduledAt` desc | `200` / `500` |
| `DELETE` | `/api/emails/:id` | Cancel scheduled email job (removes BullMQ delayed job, sets DB status `CANCELLED`) | `200` / `404` (Not Found) / `400` (Invalid Status) |

---

## 7. Current BullMQ / Redis Architecture

- **Redis Instance**: Redis 7 running via Docker Compose (`REDIS_HOST=localhost`, `REDIS_PORT=6379`).
- **Queue Name**: `email-scheduler`
- **Job Data Payload**: `{ emailJobId: string }`
- **Job ID Allocation**: Queue `jobId` set equal to `EmailJob.id` (UUID).
- **Concurrency**: `EMAIL_WORKER_CONCURRENCY=5`
- **Retry & Backoff Settings**:
  - `EMAIL_MAX_ATTEMPTS=3`
  - `EMAIL_RETRY_DELAY=5000` (ms) with `exponential` strategy.

---

## 8. Current Email Sending Architecture

- **Transport Module**: `backend/src/lib/email.ts` using Nodemailer.
- **Environment Variables**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
- **Ethereal Test Account Fallback**: Automatically creates an Ethereal Email test account if credentials are not configured, outputting web preview URLs for local verification.

---

## 9. Current Authentication / OAuth Status

- **Status**: **NOT STARTED** (Module 8).
- Current API endpoints operate without authentication middleware. Seed script (`npm run seed`) provides test IDs (`usr_test_123`, `test-sender-id`).

---

## 10. Frontend Status

- **Status**: **NOT STARTED** (Module 11).
- No frontend directory or components exist yet.

---

## 11. What is Currently Working End-to-End

1. Docker container orchestration (PostgreSQL, Redis, Elasticsearch).
2. Seed script `npm run seed` generating test user/sender records.
3. Express REST API server running on port `5000`.
4. Idempotent scheduling via `POST /api/emails/schedule`.
5. Delayed job storage in Redis via BullMQ.
6. Worker process (`npm run worker`) picking up jobs at scheduled timestamp.
7. Real email sending via SMTP / Ethereal Email.
8. State transitions: `SCHEDULED` -> `PROCESSING` -> `SENT` (populating `sentAt`).
9. Automatic retries on failure with exponential backoff (`SCHEDULED`/`RETRYING` -> `PROCESSING` -> `RETRYING` -> `FAILED` saving `attempts` and `lastError`).
10. Job cancellation via `DELETE /api/emails/:id` removing BullMQ job and marking status `CANCELLED` with worker safety guard.

---

## 12. Known Issues or Technical Debt

1. **Uncommitted Local Changes**: Module 5 (Cancel Scheduled Emails) code and migration `20260828132114_add_cancelled_email_status` are fully tested but uncommitted.
2. **Prisma Export Strategy**: Directly importing `$Enums` or `Prisma.EmailJobGetPayload` from `@prisma/client` can trigger IDE warnings in Prisma 6. Use local typed constant mapping `EmailJobStatus` (`as const`).

---

## 13. Exact NEXT MODULE to Implement

### **Module 6 — Hourly Rate Limiting**
- **Goal**: Throttling and rescheduling email jobs when hourly limit per sender is reached.
- **Key Features**:
  - Redis-backed distributed hourly counter per sender (`rate_limit:{senderId}:{yyyy-MM-dd-HH}`).
  - Configurable `MAX_EMAILS_PER_HOUR` in `.env`.
  - Worker rate limit check prior to email send attempt.
  - Automatic rescheduling to the start of the next hour when limit is exceeded without losing jobs or marking them failed.

---

## 14. Exact Recommended Order for All Remaining Modules

1. **Module 6 — Hourly Rate Limiting** (Redis rate counters, worker throttling, job rescheduling)
2. **Module 7 — Elasticsearch Indexing & Search API** (Sync email job states to Elasticsearch, `/api/emails/search` endpoint)
3. **Module 8 — Google OAuth & User Authentication** (Google OAuth 2.0, JWT tokens, protected routes)
4. **Module 9 — Slack Integration & Notifications** (Slack OAuth, webhook alerts on rate limits / failures)
5. **Module 10 — Bull Board Admin Dashboard** (Bull Board UI integration for queue & job monitoring)
6. **Module 11 — React Frontend Dashboard** (React + TypeScript + Tailwind UI for composition, CSV/TXT upload, status tracking, search)
7. **Module 12 — Deployment & End-to-End Verification** (Production build, Docker deployment, live load test)

---

## 15. Git Status & Latest Commits

### Git Branch & Commit History
- **Branch**: `main`
- **Latest Commit**: `cd50822` (*add email retry and failure handling*)

### Uncommitted Files (Module 5)
```text
modified:   backend/prisma/schema.prisma
modified:   backend/src/controllers/email.controller.ts
modified:   backend/src/routes/email.routes.ts
modified:   backend/src/services/email.service.ts
modified:   backend/src/workers/email.worker.ts
modified:   workflow.txt
untracked:  backend/prisma/migrations/20260828132114_add_cancelled_email_status/
```
