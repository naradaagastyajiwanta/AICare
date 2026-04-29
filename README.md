# AICare — Sistem Monitoring Kepatuhan Minum Obat Posyandu

<p align="center">
  <img src="dashboard/public/icon-192x192.png" width="80" alt="AICare Logo">
</p>

<p align="center">
  <b>WhatsApp-based medication adherence monitoring with AI-powered conversational follow-up</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js">
  <img src="https://img.shields.io/badge/Express-4.x-404040?style=flat-square&logo=express">
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql">
  <img src="https://img.shields.io/badge/WhatsApp-Baileys-25D366?style=flat-square&logo=whatsapp">
  <img src="https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square">
  <img src="https://img.shields.io/badge/Lang-Bahasa_Indonesia-FF0000?style=flat-square">
</p>

---

## 📖 Tentang AICare

**AICare** adalah sistem monitoring kesehatan berbasis WhatsApp yang dirancang khusus untuk **Posyandu** dan tenaga kesehatan primer. Sistem ini secara otomatis mengirimkan reminder obat, aktivitas fisik, dan pola makan kepada pasien, lalu mencatat respons mereka melalui chat AI berbahasa Indonesia.

### Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| 🤖 **AI Chat Agent** | Pasien bisa berbicara natural (bahasa Indonesia) untuk konfirmasi minum obat, lapor aktivitas, atau tanya kesehatan |
| 💊 **Multi-Category Reminders** | Obat, aktivitas fisik, dan pola makan — masing-masing dengan jadwal terpisah |
| 📊 **Dashboard Analytics** | Tracking kepatuhan harian, tren mingguan, skor kesehatan pasien |
| 📡 **Broadcast WhatsApp** | Kirim edukasi/motivasi ke semua pasien aktif dalam satu klik |
| 🧠 **RAG Knowledge Base** | AI menjawab pertanyaan pasien berdasarkan dokumen medis yang di-upload (DOCX) |
| 👨‍👩‍👧 **Guardian Notification** | Otomatis notifikasi wali pasien jika pasien tidak merespons obat |
| 📱 **PWA Installable** | Install ke homescreen mobile, berjalan seperti native app dengan bottom navigation |
| 🔔 **Cron Jobs** | Reminder otomatis setiap menit, notifikasi wali setiap 30 menit (jam 10–20 WIB) |

---

## 🏗️ Arsitektur

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              PASIEN (WhatsApp)                           │
│                    ┌─────────────┐     ┌─────────────┐                  │
│                    │  Sudah minum │     │ Tanya kesehatan│              │
│                    │   obat?     │     │   / diet?      │              │
│                    └──────┬──────┘     └──────┬──────┘                  │
└───────────────────────────┼───────────────────┼─────────────────────────┘
                            │                   │
                            ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (Express :3001)                        │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │ chat-handler │    │ PicoClaw     │    │ MCP Server   │              │
│  │ (fast-path)  │◄──►│ Bridge (WS)  │◄──►│ (SSE/HTTP)   │              │
│  │ sudah/belum  │    │ AI Agent     │    │ 9 DB Tools   │              │
│  └──────┬───────┘    └──────────────┘    └──────────────┘              │
│         │                                                               │
│         ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    REST API + Cron Jobs                          │   │
│  │  /api/patients  /api/compliance  /api/broadcasts  /api/wa/...   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        DASHBOARD (Next.js :3005)                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │  Overview  │  │  Pasien    │  │ Kepatuhan  │  │  Edukasi   │        │
│  │  (stats)   │  │  (CRUD)    │  │  (tracking)│  │ (broadcast)│        │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                        │
│  │ Knowledge  │  │  Analitik  │  │  WhatsApp  │                        │
│  │   (RAG)    │  │  (charts)  │  │   (QR)     │                        │
│  └────────────┘  └────────────┘  └────────────┘                        │
│                                                                         │
│  PWA: Installable • Bottom Nav Mobile • Soft UI Design                 │
└─────────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      PostgreSQL + PicoClaw (AI Agent)                    │
│                                                                         │
│  • PicoClaw Gateway (WS :18790) — LLM reasoning + tool calling          │
│  • OpenAI Proxy (:18792) — injects tools ke request OpenAI              │
│  • PostgreSQL (:5432) — patients, reminders, responses, RAG             │
└─────────────────────────────────────────────────────────────────────────┘
```

### Alur Pesan

1. **Fast Path** (keyword: *sudah/belum/minum/obat*): Chat-handler langsung catat ke DB + generate balasan hangat via LLM
2. **AI Path** (pertanyaan umum): Delegate ke PicoClaw → LLM (OpenAI/Gemini) → pilih tool → eksekusi via MCP → balas pasien

---

## 🛠️ Tech Stack

### Backend
| Layer | Teknologi |
|-------|-----------|
| Runtime | Node.js 20 (ES Modules) |
| Framework | Express 4 |
| Database | PostgreSQL 16 |
| WhatsApp | Baileys 7 (WhatsApp Web) |
| AI/LLM | OpenRouter / OpenAI (GPT-4o-mini, Gemini 2.5 Flash) |
| AI Agent | PicoClaw (MCP-based agent) |
| MCP Server | `@modelcontextprotocol/sdk` |
| Cron | `cron` + `tzdata` (Asia/Jakarta) |
| File Upload | Multer |
| DOCX Parsing | Mammoth |

### Dashboard
| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS 3 |
| UI Components | Lucide React |
| Animation | Framer Motion |
| Charts | Recharts |
| Dates | date-fns (locale: id) |
| PWA | `@ducanh2912/next-pwa` |

---

## 🚀 Quick Start

### Prasyarat
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js 20+](https://nodejs.org/)
- OpenAI API Key (atau OpenRouter key)
- PicoClaw v0.2.7+ (untuk AI agent — lihat [PicoClaw docs](https://picoclaw.io))

### Mode 1: One-Command Start (PowerShell)

```powershell
# Jalankan semua services (Docker + PicoClaw + Proxy)
.\start-aicare.ps1

# Mode background (tanpa jendela log)
.\start-aicare.ps1 -Background

# Stop semua
.\stop-aicare.ps1
```

Script ini akan:
1. Membaca API key dari `~\.picoclaw\.security.yml`
2. Menjalankan Docker Compose (DB + Backend + Dashboard)
3. Menjalankan OpenAI Proxy
4. Menjalankan PicoClaw Gateway
5. Menampilkan log real-time

### Mode 2: Docker Only (tanpa AI Agent)

```bash
# Copy env
cp backend/.env.example backend/.env
# Edit backend/.env — isi OPENAI_API_KEY

# Jalankan
docker compose up -d --build

# Dashboard: http://localhost:3005
# Backend API: http://localhost:3001
```

### Mode 3: Development (manual)

```bash
# Terminal 1 — Backend
cd backend
cp .env.example .env
npm install
npm run dev        # Port 3001, dengan embedded PostgreSQL

# Terminal 2 — Dashboard
cd dashboard
npm install
npm run dev        # Port 3000

# Terminal 3 — PicoClaw (opsional, untuk AI chat)
.\picoclaw-source\picoclaw.exe gateway

# Terminal 4 — OpenAI Proxy (opsional)
$env:OPENAI_API_KEY = "sk-..."
node openai-proxy.js
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://aicare:aicare_secret@localhost:5432/aicare
PORT=3001

# OpenAI — REQUIRED untuk AI agent replies
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# PicoClaw (opsional, untuk AI agent)
PICO_URL=http://host.docker.internal:18790
PICO_TOKEN=aicare-pico-token-2026
```

### Docker Compose

| Service | Port | Environment |
|---------|------|-------------|
| PostgreSQL | `5432` | `POSTGRES_DB=aicare`, `POSTGRES_USER=aicare` |
| Backend | `3001` | `DATABASE_URL`, `OPENAI_API_KEY` |
| Dashboard | `3005` | `BACKEND_URL=http://backend:3001` |

### PicoClaw (di luar Docker)

| Service | Port | File Konfigurasi |
|---------|------|-----------------|
| PicoClaw Gateway | `18790` | `~\.picoclaw\config.json` |
| OpenAI Proxy | `18792` | `openai-proxy.js` (root project) |

---

## 📱 PWA (Progressive Web App)

AICare Dashboard sudah PWA-ready. Fitur:

- **Installable** — "Add to Home Screen" di Chrome/Android atau Safari/iOS
- **Standalone** — Berjalan tanpa browser chrome (fullscreen)
- **Offline** — Service worker caching halaman & assets
- **Bottom Navigation** — Navigasi mobile seperti native app
- **Safe Area** — Support notch & home indicator (iPhone/Android modern)

### Cara Install

1. Buka `http://localhost:3005` di Chrome/Safari mobile
2. Menu → "Add to Home Screen" / "Tambah ke Layar Utama"
3. AICare akan muncul di homescreen dengan icon brand blue

### Bottom Navigation

| Primary Tabs | Overflow (Lainnya) |
|-------------|-------------------|
| Overview | Edukasi |
| Pasien | Broadcast |
| Kepatuhan | Knowledge Base |
| Laporan | Analitik |
| | WhatsApp |

---

## 🗄️ Database Schema

```sql
patients              — Data pasien + wali + status aktif
patient_reminders     — Jadwal reminder multi-kategori (obat/aktivitas/diet)
reminders             — Log pengiriman reminder per hari
responses             — Jawaban pasien (YES/NO/UNCLEAR)
patient_daily_scores  — Skor harian (obat + aktivitas + diet = 300 max)
knowledge_base        — Dokumen RAG dengan OpenAI embeddings
broadcasts            — Riwayat pesan broadcast
education_materials   — Materi edukasi + gambar
```

### Skoring
| Kategori | Kriteria | Skor |
|----------|----------|------|
| Obat | Sudah minum (YES) | 100 pts |
| Aktivitas | ≥2 sesi | 100 pts, 1 sesi = 50 pts |
| Pola Makan | Makan sehat | 100 pts |
| **All Positive** | 100 + ≥50 + 100 | Trigger pesan motivasi otomatis |

---

## 🔌 API Endpoints

### Patients
| Endpoint | Method | Keterangan |
|----------|--------|------------|
| `/api/patients` | GET | List semua pasien + compliance rate |
| `/api/patients` | POST | Tambah pasien baru |
| `/api/patients/:id` | PUT | Update data pasien |
| `/api/patients/:id` | DELETE | Hapus pasien |
| `/api/patients/:id/status` | PATCH | Toggle aktif/nonaktif |

### Compliance & Reports
| Endpoint | Method | Keterangan |
|----------|--------|------------|
| `/api/compliance?days=7` | GET | Tracking kepatuhan per pasien per hari |
| `/api/self-reports?days=7` | GET | Laporan harian pasien (skor) |
| `/api/stats` | GET | Ringkasan dashboard (counts, trends) |

### Knowledge Base (RAG)
| Endpoint | Method | Keterangan |
|----------|--------|------------|
| `/api/knowledge` | GET/POST | List / tambah dokumen |
| `/api/knowledge/:id` | PUT/DELETE | Update / hapus |
| `/api/knowledge/parse-docx` | POST | Parse DOCX ke chunks |
| `/api/knowledge/bulk` | POST/DELETE | Bulk save / bulk delete |

### Broadcast & Education
| Endpoint | Method | Keterangan |
|----------|--------|------------|
| `/api/broadcasts` | GET/POST | Riwayat / kirim broadcast |
| `/api/education` | GET/POST | Materi edukasi (support image upload) |

### WhatsApp
| Endpoint | Method | Keterangan |
|----------|--------|------------|
| `/api/wa/status` | GET | Status koneksi WhatsApp |
| `/api/wa/events` | GET | SSE stream status real-time |
| `/api/wa/restart` | POST | Restart koneksi + tampilkan QR baru |

### MCP Server
| Endpoint | Keterangan |
|----------|------------|
| `/sse` | SSE transport (legacy) |
| `/mcp` | Streamable HTTP (modern MCP spec) |

---

## 📁 Project Structure

```
AICare/
├── backend/
│   ├── src/
│   │   ├── api/routes.js          # REST API endpoints
│   │   ├── chat-handler.js        # WhatsApp message routing (fast path)
│   │   ├── cron/reminder.js       # Automated reminder & guardian notify
│   │   ├── db/
│   │   │   ├── schema.sql         # PostgreSQL schema
│   │   │   ├── index.js           # DB connection pool
│   │   │   └── embedded.js        # Embedded Postgres (dev mode)
│   │   ├── mcp/server.js          # MCP tool server (9 tools)
│   │   ├── picoclaw/bridge.js     # WebSocket bridge ke AI agent
│   │   ├── whatsapp/service.js    # Baileys WhatsApp client
│   │   ├── llm-client.js          # OpenAI/OpenRouter client
│   │   ├── rag.js                 # Embeddings + DOCX parsing
│   │   ├── ai-agent.js            # Agent orchestration
│   │   ├── index.js               # Entry point (production)
│   │   └── dev.js                 # Entry point (development)
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
│
├── dashboard/                     # Next.js 14 PWA Dashboard
│   ├── app/                       # App Router pages
│   │   ├── page.jsx               # Overview (stats + charts)
│   │   ├── patients/page.jsx      # Patient CRUD
│   │   ├── compliance/page.jsx    # Medication tracking
│   │   ├── self-reports/page.jsx  # Daily health scores
│   │   ├── education/page.jsx     # Education materials
│   │   ├── knowledge/page.jsx     # RAG knowledge base
│   │   ├── broadcast/page.jsx     # WhatsApp broadcast
│   │   ├── analytics/page.jsx     # Charts & analytics
│   │   ├── whatsapp/page.jsx      # QR code connection
│   │   ├── layout.jsx             # Root layout + PWA meta
│   │   └── api/[...path]/route.js # Proxy ke backend
│   ├── components/
│   │   ├── ui/                    # Reusable UI components
│   │   ├── Sidebar.jsx            # Desktop navigation
│   │   ├── BottomNav.jsx          # Mobile bottom tabs
│   │   ├── MoreSheet.jsx          # Mobile overflow menu
│   │   ├── MobileHeader.jsx       # Mobile sticky header
│   │   └── StatsCard.jsx          # Metric cards
│   ├── lib/api.js                 # Frontend API client
│   ├── public/
│   │   ├── manifest.json          # PWA manifest
│   │   ├── icon-192x192.png       # PWA icon
│   │   └── icon-512x512.png       # PWA maskable icon
│   ├── Dockerfile
│   └── package.json
│
├── picoclaw-source/               # PicoClaw AI Agent (Go)
│   └── ...                        # Build dari source
│
├── docker-compose.yml             # Full stack orchestration
├── start-aicare.ps1               # One-command start (PowerShell)
├── stop-aicare.ps1                # Stop all services
├── openai-proxy.js                # Proxy inject tools ke OpenAI
├── chat-handler.js                # Root-level message handler
└── README.md                      # This file
```

---

## 🎨 Design System

AICare menggunakan **Soft Health UI** — design language modern untuk healthcare apps:

- **Primary**: Healthcare Blue `#2563EB`
- **Background**: Ice Blue `#F0F4F8`
- **Surface**: White dengan soft shadow (`shadow-soft`)
- **Cards**: `rounded-2xl`, borderless, blue-tinted elevation
- **Success**: Emerald `#10B981` untuk kompliance/kepatuhan
- **Typography**: Inter, tight tracking, bold hierarchy
- **Mobile**: Bottom nav + safe area aware + PWA installable

---

## 🧪 Testing

```powershell
# Health check
Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET

# Test PicoClaw AI (via WebSocket)
cd backend
node -e "
const WebSocket = require('ws');
const ws = new WebSocket('ws://127.0.0.1:18790/pico/ws', {
  headers: { Authorization: 'Bearer aicare-pico-token-2026' }
});
ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'message.send',
    payload: { content: 'Pesan dari 6287811152506: Sudah minum obat' }
  }));
});
ws.on('message', (d) => console.log(JSON.parse(d.toString())));
setTimeout(() => ws.close(), 10000);
"
```

---

## 🐛 Troubleshooting

| Issue | Solusi |
|-------|--------|
| WhatsApp tidak terhubung | Buka `/whatsapp` di dashboard → scan QR code |
| PicoClaw 401 Unauthorized | Sinkronkan `PICO_TOKEN` di `docker-compose.yml` dengan `~\.picoclaw\.security.yml` |
| Proxy crash / port 18792 | `netstat -ano \| findstr 18792` lalu `taskkill /PID <PID> /F` |
| Modal tertutup bottom nav | Sudah fixed — semua modal sekarang pakai `z-[60]` |
| Keyboard tutupi input mobile | Sudah fixed — modal mobile sekarang `items-start` |
| Cron tidak jalan | Pastikan `tzdata` terinstall di container: `apk add tzdata` |

---

## 📜 Lisensi

MIT License — dibuat untuk Posyandu Indonesia 🇮🇩

---

<p align="center">
  Dibuat dengan ❤️ untuk kesehatan masyarakat Indonesia
</p>

<p align="center">
  <a href="https://NAJWorks.com" target="_blank">
    <b>NAJWorks.com</b>
  </a>
</p>
