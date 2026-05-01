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

No test suite exists currently.

## Architecture

### Services
- **Backend** (Express, port 3001) — REST API + WhatsApp client + cron jobs
- **Dashboard** (Next.js, port 3000/3005) — Clinician UI, proxies all API calls to backend via `dashboard/app/api/[...path]/route.js`
- **PostgreSQL** — Single database; schema auto-loaded from `backend/src/db/schema.sql`

### Message Routing (the core flow)

Incoming WhatsApp message → `backend/src/index.js` → `chat-handler.js`:

1. **Schedule query** (`kapan`, `jam`, `jadwal`): query `patient_reminders` → return formatted schedule template. No LLM call.
2. **Short YES/NO** (`sudah`/`belum`/etc., ≤4 words or keyword in first 2 words): record directly to DB + OpenAI quick reply → send back. Never reaches the AI agent.
3. **Everything else**: `handleWithAI()` in `ai-agent.js` → OpenAI with tool_choice="auto" → may call `record_activity_report`, `record_diet_report`, or `record_medication_response` tools → returns reply.

The fast-path (step 2) uses word-boundary matching to avoid false positives (`ya` inside `obatnya`). Activity fast-path records 1 session for YES; AI path handles precise counts from the message.

### AI Agent (`backend/src/ai-agent.js`)

Uses OpenAI SDK directly (`OPENAI_API_KEY`, default model `gpt-4o-mini`). Two exported functions:
- `generateQuickReply(patient, answer, category)` — single LLM call, no tools, warm response for fast-path YES/NO. Returns `null` on failure (caller falls back to template).
- `handleWithAI(patient, text)` — agentic loop (max 5 iterations), injects RAG knowledge context, calls tools in parallel, returns final reply.

### RAG System (`backend/src/rag.js`)

`retrieveRelevantKnowledge(text)` performs vector similarity search on `knowledge_base` table embeddings. `formatKnowledgeContext(docs)` appends results to the system prompt. Knowledge documents are imported via `/api/knowledge/parse-docx` (chunks Word docs before embedding). OpenAI embeddings API is used for both indexing and retrieval.

### WhatsApp Service (`backend/src/whatsapp/service.js`)

Uses Baileys (`@whiskeysockets/baileys`) library. Key behaviors:
- Session persisted in `wa-session/` directory; cleared automatically on `loggedOut`/`badSession` disconnect codes
- Reconnection: exponential backoff up to 10 attempts, capped at 15s delay; enters `stopped` state on `forbidden` (banned) or after max attempts
- SSE (`/api/wa/status-stream`): 25-second keepalive comment lines prevent proxy timeouts; QR code is a data URL broadcast to all connected dashboard clients
- Typing indicator (`composing`) sent while processing; `paused` sent before reply delivery

### `backend/src/mcp/server.js`

Despite the name, this file is now an internal utility module — it exports `upsertDailyScore(patientId)` which recalculates and upserts `patient_daily_scores` after any response is recorded. Not an MCP protocol server.

### Cron Jobs (`backend/src/cron/reminder.js`)

All times are Asia/Jakarta. Two jobs:
1. **Every minute**: Check `patient_reminders` for slots whose `reminder_time ≤ now` not yet sent today → send WhatsApp → insert into `reminders`.
2. **Every 30 min (10:00–20:00)**: Find medication non-responders with `guardian_phone` set → notify guardian → update `reminders.guardian_notified_at`.

### Database Schema Key Points

- `patient_reminders`: multi-category reminder slots (medication / activity / diet) per patient. Unique on `(patient_id, category, reminder_time)`.
- `reminders`: log of what was sent today. Unique on `(patient_id, scheduled_date, reminder_slot_id)`.
- `responses`: raw patient replies — `response_type` distinguishes medication/activity/diet.
- `patient_daily_scores`: aggregated daily scores. `all_positive=true` + `motivation_sent=false` is the atomic claim condition for the celebration message.
- Scoring: medication 100pts (YES), activity 100pts (≥2 sessions) / 50pts (1 session), diet 100pts. `all_positive` = medication=100 AND activity≥50 AND diet=100.

### Dashboard Pages

All under `dashboard/app/`: patients, reminders, compliance, analytics, self-reports, broadcast, education, knowledge, guide, whatsapp.

## Environment Variables

See `backend/.env.example`. Key vars:
```
DATABASE_URL=postgresql://aicare:aicare_secret@localhost:5432/aicare
PORT=3001
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

## Language & Conventions

- All patient-facing messages are in **Bahasa Indonesia**.
- Backend uses **ES modules** (`"type": "module"` in package.json) — use `import`/`export`, not `require`.
- Dashboard uses Next.js App Router. API routes under `dashboard/app/api/` proxy to the backend.
