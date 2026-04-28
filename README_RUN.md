# 🏃 Cara Menjalankan AICare

## Ringkasan

AICare terdiri dari 5 services:

| Service | Port | Fungsi |
|---------|------|--------|
| PostgreSQL | `5432` | Database pasien, reminder, response |
| Backend API | `3001` | REST API + MCP Server + WhatsApp bridge |
| Dashboard | `3005` | Web UI (Next.js) |
| **PicoClaw** | `18790` | AI Agent (LLM + tool calling) |
| **OpenAI Proxy** | `18792` | Inject tools ke request OpenAI |

> ⚠️ **PicoClaw v0.2.7 memiliki bug** — tidak mengirim `tools` array ke OpenAI.  
> OpenAI Proxy memperbaiki ini secara otomatis.

---

## 🚀 Quick Start (1 Command)

Buka **PowerShell** di folder project, lalu jalankan:

```powershell
.\start-aicare.ps1
```

Script akan:
1. Baca API key dari `~\.picoclaw\.security.yml`
2. Start Docker (DB + Backend + Dashboard)
3. Start OpenAI Proxy
4. Start PicoClaw Gateway
5. Tampilkan **log real-time**

**Untuk berhenti:** tekan `Ctrl+C`

---

## 🖥️ Mode Background (Tidak Ada Jendela Log)

Jika ingin services jalan di belakang tanpa jendela log:

```powershell
.\start-aicare.ps1 -Background
```

Untuk berhenti:
```powershell
.\stop-aicare.ps1
```

---

## 🔧 Manual (Step by Step)

Jika ingin kontrol penuh, jalankan satu per satu:

### 1. Docker Services
```powershell
docker compose up -d
```

### 2. OpenAI Proxy
```powershell
$env:OPENAI_API_KEY = (Get-Content "$env:USERPROFILE\.picoclaw\.security.yml" -Raw | Select-String "api_keys:\s*\n\s*-\s*(sk-[-a-zA-Z0-9]+)" | ForEach-Object { $_.Matches.Groups[1].Value })
node openai-proxy.js
```

### 3. PicoClaw Gateway
```powershell
.\picoclaw\picoclaw.exe gateway
```

---

## 📊 Cek Status

```powershell
# Cek semua port
netstat -ano | findstr "18790"
netstat -ano | findstr "18792"
netstat -ano | findstr "3001"
netstat -ano | findstr "3005"

# Cek Docker
docker compose ps

# Cek health backend
Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET
```

---

## 🧪 Test End-to-End

Kirim pesan test ke PicoClaw:

```powershell
cd backend
node -e "
const WebSocket = require('ws');
const ws = new WebSocket('ws://127.0.0.1:18790/pico/ws', {
  headers: { Authorization: 'Bearer aicare-pico-token-2026' }
});
ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'message.send',
    payload: { content: 'Pesan dari nomor WhatsApp 6287811152506: Sudah minum obat' }
  }));
});
ws.on('message', (d) => {
  const msg = JSON.parse(d.toString());
  if (msg.type === 'message.create') console.log('Response:', msg.payload.content);
});
setTimeout(() => ws.close(), 10000);
"
```

**Response yang diharapkan:**
```
Response: Pesan dari Jiwan telah dicatat bahwa ia sudah minum obatnya...
```

---

## 🌐 Akses Dashboard

Buka browser: **http://localhost:3005**

---

## ❌ Troubleshooting

### Port sudah digunakan
```powershell
# Cek apa yang pakai port
tasklist | findstr picoclaw
tasklist | findstr node

# Kill manual
taskkill /PID <PID> /F
```

### Proxy tidak start
- Pastikan file `openai-proxy.js` ada di root folder
- Pastikan `OPENAI_API_KEY` environment variable ter-set

### PicoClaw 401 Unauthorized
- Pastikan `PICO_TOKEN` di `docker-compose.yml` sama dengan token di `~\.picoclaw\.security.yml`

### Docker gagal start
```powershell
docker compose down
docker compose up -d --build
```

---

## 📁 File Penting

| File | Lokasi | Keterangan |
|------|--------|------------|
| `config.json` | `~\.picoclaw\config.json` | Konfigurasi PicoClaw (model, cron, MCP) |
| `.security.yml` | `~\.picoclaw\.security.yml` | API keys & token |
| `openai-proxy.js` | `./openai-proxy.js` | Proxy inject tools |
| `start-aicare.ps1` | `./start-aicare.ps1` | Start script |
| `stop-aicare.ps1` | `./stop-aicare.ps1` | Stop script |
