# ReachInbox - Scalable Distributed Email Scheduler & Management System

A production-grade, full-stack email scheduling, queueing, throttling, and analytics platform built with **TypeScript**, **Node.js/Express**, **PostgreSQL**, **Redis (BullMQ)**, **Elasticsearch**, and **React (Vite)**.

---

## 📑 Table of Contents

- [System Architecture](#system-architecture)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start Guide](#quick-start-guide)
  - [1. Start Infrastructure (Docker)](#1-start-infrastructure-docker)
  - [2. Setup & Migrate Backend](#2-setup--migrate-backend)
  - [3. Run Backend API Server](#3-run-backend-api-server)
  - [4. Run BullMQ Email Worker](#4-run-bullmq-email-worker)
  - [5. Run React Frontend Dashboard](#5-run-react-frontend-dashboard)
- [Environment Configuration](#environment-configuration)
- [REST API Endpoints](#rest-api-endpoints)
- [Worker, Queues & Throttling](#worker-queues--throttling)
- [Observability & Monitoring](#observability--monitoring)
- [Verification & Test Scripts](#verification--test-scripts)
- [Project Directory Structure](#project-directory-structure)

---

## 🏛 System Architecture

```mermaid
flowchart TD
    subgraph Client ["Frontend (React + Vite)"]
        UI["Dashboard & Compose UI\n(Port 5173)"]
    end

    subgraph Backend ["Backend Services (Node.js / Express)"]
        API["REST API Server\n(Port 5000)"]
        OAuth["Google OAuth 2.0 &\nGmail API Service"]
        Limiter["Distributed Hourly\nRate Limiter (Redis Lua)"]
        ES_Sync["Elasticsearch\nSync Service"]
    end

    subgraph Infrastructure ["Containerized Infrastructure (Docker)"]
        PG[("PostgreSQL 16\n(Port 5433:5432)")]
        Redis[("Redis 7 (BullMQ & Cache)\n(Port 6379)")]
        ES[("Elasticsearch 8.13\n(Port 9200)")]
    end

    subgraph Processing ["Background Workers"]
        Worker["BullMQ Email Worker\n(Concurrency: 5)"]
        Provider["Email Provider Factory\n(Gmail / Resend / Mock)"]
    end

    subgraph External ["External Integrations"]
        GoogleAuth["Google Accounts / Gmail API"]
        Slack["Slack Webhook Alerts"]
        Prometheus["Prometheus / Grafana Metrics"]
    end

    UI -->|HTTP / REST| API
    API -->|Persist Metadata| PG
    API -->|Enqueue Jobs| Redis
    API -->|Index Email Jobs| ES
    API <-->|OAuth Tokens| GoogleAuth

    Worker -->|Fetch Scheduled Jobs| Redis
    Worker -->|Rate Limit Checks| Limiter
    Limiter -->|Atomic Counter| Redis
    Worker -->|Send Emails| Provider
    Provider -->|API Dispatch| GoogleAuth
    Worker -->|Update Status| PG
    Worker -->|Update Index| ES
    Worker -->|Alert on Failure| Slack

    API -->|Export Metrics /metrics| Prometheus
```

---

## ✨ Key Features

- **🕒 Accurate Job Scheduling**: Schedule individual or batch emails at exact future timestamps using **BullMQ** delayed jobs backed by **Redis**.
- **⚡ Atomic Hourly Rate Limiting**: Distributed rate-limiting per sender using atomic Redis Lua scripts to enforce sending limits without dropping jobs (automatically reschedules overflow jobs to the start of the next hour).
- **🔁 Fault Tolerance & Retries**: Automated exponential backoff and retry handling (`EMAIL_MAX_ATTEMPTS=3`) with detailed error captures in PostgreSQL.
- **🔍 Full-Text Search via Elasticsearch**: Fast multi-match searching across recipient emails, subject lines, and body content with real-time index synchronization.
- **🔒 Google OAuth 2.0 & Gmail Integration**: Connect real Google accounts with `gmail.send` scope; messages are sent natively via Gmail REST API using RFC 2822 MIME formatting.
- **📊 Prometheus Observability**: Built-in `/metrics` endpoint exporting Prometheus counters, duration histograms, and real-time BullMQ queue depth gauges.
- **🚨 Instant Slack Alerting**: Automated rich webhook notifications for failed delivery attempts, rate-limit triggers, and critical exceptions.
- **🎨 Pixel-Perfect React Dashboard**: Modern responsive UI with pixel-art branding, Scheduled vs. Sent views, quick scheduling presets, and rich composer.

---

## 🛠 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Lucide Icons, Custom CSS |
| **Backend API** | Node.js, Express, TypeScript, tsx watch |
| **Database & ORM** | PostgreSQL 16, Prisma ORM v6 |
| **Job Queue & Cache** | Redis 7, BullMQ v6, ioredis |
| **Search Engine** | Elasticsearch 8.13.0 |
| **Email Transports** | Gmail REST API (`googleapis`), Resend HTTP API, Mock Provider |
| **Observability** | Prometheus (`prom-client`), Grafana, Slack Webhooks |
| **Containerization** | Docker, Docker Compose |

---

## 📋 Prerequisites

Before starting, ensure you have installed:
- [Docker Desktop](https://www.docker.com/) (must be running)
- [Node.js](https://nodejs.org/) (v18.x or v20.x+)
- [npm](https://www.npmjs.com/) (v9.x+)

---

## 🚀 Quick Start Guide

### 1. Start Infrastructure (Docker)
From the repository root, start PostgreSQL, Redis, and Elasticsearch:

```powershell
docker compose up -d
```

Verify that all containers are healthy:
```powershell
docker compose ps
```

### 2. Setup & Migrate Backend
Navigate into the `backend` directory, install dependencies, and run Prisma migrations:

```powershell
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npx prisma generate
npm run seed
npm run es:index
```

### 3. Run Backend API Server
Start the Express API server in **Terminal 1**:

```powershell
cd backend
npm run dev
```
- API Server runs at: **`http://localhost:5000`**
- Health Check: **`http://localhost:5000/api/health`**
- Metrics Endpoint: **`http://localhost:5000/metrics`**

### 4. Run BullMQ Email Worker
Start the BullMQ background worker in **Terminal 2**:

```powershell
cd backend
npm run worker
```
- Listens to the `email-scheduler` queue and processes delayed jobs.

### 5. Run React Frontend Dashboard
Start the Vite development server in **Terminal 3**:

```powershell
cd frontend
npm install
npm run dev
```
- Dashboard runs at: **`http://localhost:5173`**

---

## ⚙️ Environment Configuration

### Backend (`backend/.env`)

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database & Cache
DATABASE_URL=postgresql://reachinbox_user:reachinbox_password@localhost:5433/reachinbox
REDIS_HOST=localhost
REDIS_PORT=6379
ELASTICSEARCH_NODE=http://localhost:9200

# Scheduling & Rate Limiting
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
SESSION_SECRET=your_jwt_secret_key

# Slack Alerting
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:5000
```

---

## 📡 REST API Endpoints

### Authentication & Accounts
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/auth/google` | Initiates Google OAuth 2.0 authorization redirect |
| `GET` | `/api/auth/google/callback` | OAuth 2.0 code exchange & session token generation |
| `GET` | `/api/auth/me` | Fetches authenticated user profile & connected senders |
| `POST` | `/api/auth/logout` | Clears user session |
| `GET` | `/api/accounts` | Lists connected Google/Gmail accounts |
| `DELETE` | `/api/accounts/:id` | Disconnects and removes a Google account |

### Email Scheduling & Management
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/emails/schedule` | Schedules a single or batch email job (supports idempotency) |
| `GET` | `/api/emails` | Lists scheduled, sent, and failed email jobs (with status filter) |
| `GET` | `/api/emails/:id` | Retrieves single email job details |
| `DELETE` | `/api/emails/:id` | Cancels a scheduled job and removes it from BullMQ queue |
| `GET` | `/api/emails/search` | Multi-match full-text search powered by Elasticsearch |

### Health & Observability
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health (PostgreSQL, Redis, Elasticsearch status) |
| `GET` | `/metrics` | Prometheus metrics scrape target |

---

## 🧪 Verification & Test Scripts

All test suites can be executed from the `backend/` directory:

```powershell
npm run test:health     # Checks PostgreSQL, Redis & Elasticsearch health
npm run test:ratelimit  # Tests Redis Lua atomic rate limiting and rollover
npm run test:es         # Verifies Elasticsearch index creation and search
npm run test:metrics    # Tests Prometheus metrics collection and formatting
npm run test:provider   # Tests email dispatch via Resend / Mock providers
npm run test:oauth      # Tests Google OAuth token verification and Gmail API
npm run test:slack      # Dispatches a test alert to the configured Slack webhook
```

---

## 📂 Project Directory Structure

```
reachinbox-email-scheduler/
├── docker-compose.yml           # PostgreSQL, Redis & Elasticsearch services
├── PROJECT_STATUS.md            # Complete implementation status & roadmap
├── README.md                    # Main project documentation
├── backend/
│   ├── prisma/                  # Prisma schema and database migrations
│   ├── src/
│   │   ├── controllers/         # Express route handlers
│   │   ├── lib/                 # Database, Redis, Elasticsearch & Prometheus clients
│   │   ├── middleware/          # JWT auth, validation, rate limiters
│   │   ├── routes/              # Express API route definitions
│   │   ├── scripts/             # DB seeding and test scripts
│   │   ├── services/            # Core business logic (Email, Queue, Provider, Search)
│   │   ├── workers/             # BullMQ background worker definitions
│   │   ├── app.ts               # Express application configuration
│   │   └── server.ts            # Server entry point
│   ├── .env.example             # Backend environment template
│   └── package.json
└── frontend/
    ├── src/
    │   ├── assets/              # Static images and icons
    │   ├── components/          # Sidebar, SearchBar, OnbLogo, etc.
    │   ├── pages/               # Login, Compose, EmailListView, EmailDetailView
    │   ├── services/            # Frontend API client
    │   ├── App.tsx              # Main dashboard router & state management
    │   └── main.tsx             # React entry point
    ├── .env.example             # Frontend environment template
    └── package.json
```

---

## 📄 License
This project is licensed under the ISC License.