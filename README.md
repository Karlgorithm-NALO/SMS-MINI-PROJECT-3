<div align="center">

<img src="app/icon.svg" width="76" alt="Nalo SMS Platform logo">

# Nalo SMS Platform

_by Karlson_

**Real-time SMS dispatch and delivery tracking via the Nalo Solutions SMS API.**

[Run with Docker](#how-to-run-with-docker) · [Environment Variables](#environment-variables) · [Database Persistence](#database--history-persistence) · [Local Callback Testing](#testing-callbacks-locally) · [API Endpoints](#api-endpoints)

![Next.js 14](https://img.shields.io/badge/Next.js-14-0F1B33?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-0F1B33?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-0F1B33?logo=tailwindcss&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)
![Tests Passing](https://img.shields.io/badge/tests-16_passing-22A05B)

</div>

---

## Overview

A modern web platform that sends real SMS through the **Nalo Solutions SMS Gateway** and tracks live delivery reports (DLR) as callbacks return.

Built with Next.js 14 (App Router, TypeScript), Tailwind CSS, and robust persistent storage (**PostgreSQL with dedicated Docker volume** and fallback SQLite support). Containerized with Docker and Docker Compose for zero-friction single-command deployment.

## Features

- **Send SMS Form:**
  - Multi-recipient support: Enter single or comma-separated numbers in international format (e.g. `233XXXXXXXXX`).
  - Real-time recipient pills: Instantly highlights valid numbers and flags formatting errors before submission.
  - Live character and segment counter: Calculates standard GSM 7-bit (160 chars) vs Unicode (70 chars) with segment counts.
  - Sender ID dropdown: Dynamically loaded from configuration (`SENDER_IDS`), ensuring only registered account Sender IDs are dispatched.
- **Client & Server Pre-Flight Validation:**
  - Immediately rejects empty messages, missing sender IDs, or malformed numbers with clear, actionable warnings before calling the gateway.
- **Real-Time Gateway Feedback:**
  - Displays gateway acceptance state, assigned `message_id`, destination count, and exact error messages (e.g. `1707: Invalid Sender ID`) returned by Nalo.
- **Delivery Callbacks Webhook:**
  - Exposes `/api/callback` to ingest asynchronous Delivery Reports (DLR) from Nalo.
  - Automatically updates message records with final delivery status (`DELIVRD`, `PENDING`, `FAILED`) and callback timestamps.
- **Live Message History & Status Polling:**
  - Table auto-refreshes every 3.5 seconds without manual page reload.
  - Status badges, search/filter controls, and deep inspection drawer to inspect raw callback JSON payloads.
- **Persistent Database & History Guarantee:**
  - Powered by **PostgreSQL** in Docker with a dedicated named volume (`postgres_data`), ensuring message history and delivery reports survive container restarts, rebuilds, and deployments.
  - Automatic fallback to SQLite (`data/messages.db`) for lightweight local testing or offline environments.
- **Zero-Secret Security:**
  - Gateway API keys are loaded strictly on the server from environment variables and never exposed to the client.

---

## Tech Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Styling:** Tailwind CSS with custom brand design system
- **Database:** PostgreSQL 16 (in Docker Compose via `postgres_data` volume) + fallback SQLite (`node:sqlite`)
- **Containerization:** Docker & Docker Compose (`node:22-bookworm-slim` + `postgres:16-alpine`)
- **Tunnels:** Native Cloudflare Tunnel (`cloudflared`) and ngrok support

---

## Configuration

All configuration is managed through environment variables. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### Environment Variables Explained

| Variable | Required | Description | Example |
| :--- | :--- | :--- | :--- |
| `SMS_API_KEY` | **Yes** | Your private Nalo SMS API key. Never shared with the client. | `your_nalo_api_key` |
| `SENDER_IDS` | **Yes** | Comma-separated list of approved Sender IDs registered on your Nalo account (max 11 chars each). | `HappyTest,MYBRAND` |
| `CALLBACK_BASE_URL` | Optional | Public HTTPS base URL where Nalo pushes delivery callbacks. Set to your tunnel or deployed domain. | `https://xxxx.trycloudflare.com` |
| `DATABASE_URL` | Optional | PostgreSQL connection string. Provided automatically by Docker Compose (`postgresql://nalo:nalosecretpassword@db:5432/nalosms`). In production, use your cloud Postgres URL. | `postgresql://user:pass@host:5432/db` |
| `PORT` | Optional | Port to expose the web server on (defaults to `3000`). | `3000` |

---

## How to Run with Docker

The entire platform runs with a single command on a clean machine:

```bash
# 1. Clone repository and enter directory
cd "NALO Project"

# 2. Copy environment template
cp .env.example .env

# 3. Add your SMS_API_KEY and SENDER_IDS to .env

# 4. Build and start with Docker Compose
docker compose up --build
```

The app will be accessible at: **`http://localhost:3000`**

Docker Compose automatically launches:
1. `db`: PostgreSQL 16 server with persistent Docker volume (`postgres_data`).
2. `app`: Next.js web application connected to the database.

---

## Database & History Persistence

To guarantee you **never lose message history or delivery reports**:
1. **In Docker (Local & Production):**
   - A dedicated Docker volume `postgres_data` stores PostgreSQL data files independently of application containers.
   - Even if you stop (`docker compose down`), rebuild (`--build`), or upgrade containers, your messages and delivery reports remain completely intact.
2. **Cloud Deployments (Render / Railway / Supabase / Neon):**
   - Connect any managed PostgreSQL database by setting `DATABASE_URL` in your platform's dashboard.
3. **Local Standalone Dev / Testing:**
   - If `DATABASE_URL` is omitted, the app falls back to SQLite (`data/messages.db`) automatically.

---

## Testing Callbacks Locally

The Nalo SMS gateway needs a public HTTPS URL to push asynchronous delivery status reports. When testing locally, use a tunnel:

### Option A: Cloudflare Quick Tunnel (Recommended - No Account Needed)

Run the tunnel via Docker Compose profile:

```bash
docker compose --profile tunnel up
```

Or run `cloudflared` directly in your terminal:

```bash
cloudflared tunnel --url http://localhost:3000
```

`cloudflared` will print a public URL:
```text
https://random-subdomain.trycloudflare.com
```

Add this URL to your `.env` file:
```env
CALLBACK_BASE_URL=https://random-subdomain.trycloudflare.com
```

Restart the app. The backend will pass `${CALLBACK_BASE_URL}/api/callback` in Nalo API calls, and delivery reports will automatically reflect in real time on the dashboard!

### Option B: ngrok

```bash
ngrok http 3000
```
Copy the generated `https://xxxx.ngrok-free.app` URL to `CALLBACK_BASE_URL` in your `.env`.

---

## API Endpoints

- **`POST /api/send`**: Dispatches SMS to one or more numbers via Nalo gateway.
  - Body: `{ "numbers": "233241234567, 233501234567", "senderId": "HappyTest", "message": "Hello!" }`
- **`POST /api/callback`**: Webhook endpoint that receives DLR delivery report JSON or form data from Nalo.
- **`GET /api/messages`**: Returns latest sent messages and delivery stats for polling.
- **`GET /api/config`**: Returns configured sender IDs, active database engine, and webhook status.

---

## Automated Tests

Run the test suite:

```bash
npm test
```

16 unit tests verify:
- Database CRUD and status updates (PostgreSQL / SQLite compatibility)
- International Ghanaian number format validation (`233XXXXXXXXX`)
- Rejection of numbers starting with `0` with helpful instructions
- Comma-separated multi-recipient parsing
- GSM 7-bit vs Unicode UCS-2 character and segment counts
- Pre-flight form validation rules (empty message, missing sender ID, invalid numbers)

---

## Author

Built by **Karlson** for the **SMS Platform Project / Nalo Solutions**.
