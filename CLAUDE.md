# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AICare is a medication adherence monitoring system that communicates with patients via WhatsApp. It tracks medication intake, physical activity, and diet through conversational AI, with a Next.js dashboard for clinicians.

## Commands

### Backend
```bash
cd backend
npm run dev        # Dev mode with embedded PostgreSQL (no Docker needed)
npm start          # Production mode (requires external PostgreSQL)
```

### Dashboard
```bash
cd dashboard
npm run dev        # Dev server on port 3000
npm run build
npm start
```

### Docker (full stack)
```bash
docker-compose up          # Starts postgres, backend (3001), dashboard (3005)
docker-compose up --build  # Rebuild images
```

### No test suite exists currently.

## Architecture

### Services
- **Backend** (Express, port 3001) — REST API + WhatsApp client + MCP server + cron jobs
- **Dashboard** (Next.js, port 3000/3005) — Clinician UI, proxies API calls to backend
- **PicoClaw** (Go binary, port 18790) — AI agent that uses MCP tools to handle complex conversations; runs separately (not in Docker)
- **PostgreSQL** — Single database; schema auto-loaded from `backend/src/db/schema.sql`

### Message Routing (the core flow)

Incoming WhatsApp message → `backend/src/index.js` → `chat-handler.js` fast-path:

1. **Keyword match** (sudah/belum/etc. for medication YES/NO): record directly to DB + LLM-generated warm reply → send back. Never reaches PicoClaw.
2. **No keyword match**: delegate to `picoclaw/bridge.js` → WebSocket to PicoClaw agent → PicoClaw calls MCP tools on backend → returns reply.

The fast-path exists because simple medication confirmations don't need the full AI agent roundtrip.

### MCP Server (`backend/src/mcp/server.js`)

Exposes 9 database tools for PicoClaw: `get_patient_by_phone`, `record_medication_response`, `record_activity_report`, `record_diet_report`, `record_reminder_sent`, `get_today_reports`, `get_patients_for_reminder`, `get_non_responders`, `record_guardian_notified`.

Two transports served by the backend:
- `/sse` — Legacy SSE (used by PicoClaw `config.json`)
- `/mcp` — Streamable HTTP (modern MCP spec, with an Accept-header patch in `index.js`)

### PicoClaw Bridge (`backend/src/picoclaw/bridge.js`)

Maintains one WebSocket per phone number (isolated per-user AI context). Sessions expire after 10 minutes idle. POST `/api/picoclaw/reset` tears down sessions.

### Cron Jobs (`backend/src/cron/reminder.js`)

All times are Asia/Jakarta. Two jobs:
1. **Every minute**: Check `patient_reminders` table for slots whose `reminder_time ≤ now` not yet sent today → send WhatsApp → insert into `reminders`.
2. **Every 30 min (10:00–20:00)**: Find medication non-responders with a `guardian_phone` set → notify guardian → update `reminders.guardian_notified_at`.

### Database Schema Key Points

- `patient_reminders`: multi-category reminder slots (medication / activity / diet) per patient. Unique on `(patient_id, category, reminder_time)`.
- `reminders`: log of what was sent today. Unique on `(patient_id, scheduled_date, category)`.
- `responses`: raw patient replies (medication YES/NO, activity count, diet boolean).
- `patient_daily_scores`: aggregated daily scores. `all_positive=true` + `motivation_sent=false` is the atomic claim condition for the celebration message.

### LLM Client (`backend/src/llm-client.js`)

Uses OpenRouter (default model: `google/gemini-2.5-flash`). Generates replies in Bahasa Indonesia. Functions: `generateReply`, `generateUnknownReply`, `generateScheduleReply`, `generateMotivationMessage`.

## Environment Variables

See `backend/.env.example`. Key vars:
```
DATABASE_URL=postgresql://aicare:aicare_secret@localhost:5432/aicare
PORT=3001
PICO_URL=http://127.0.0.1:18790   # PicoClaw agent address
PICO_TOKEN=                         # Optional auth token for PicoClaw
OPENROUTER_API_KEY=
OPENROUTER_MODEL=google/gemini-2.5-flash
```

In Docker, `PICO_URL` becomes `http://host.docker.internal:18790` (PicoClaw runs on host, not in container).

## Language & Conventions

- All patient-facing messages are in **Bahasa Indonesia**.
- Backend uses **ES modules** (`"type": "module"` in package.json) — use `import`/`export`, not `require`.
- Dashboard uses Next.js App Router (all pages under `dashboard/app/`). API routes under `dashboard/app/api/` proxy to the backend.
- Scores: medication 100pts (YES), activity 100pts (≥2 sessions) / 50pts (1 session), diet 100pts. `all_positive` = medication=100 AND activity≥50 AND diet=100.
