# AICare Quality Assurance Report
**Date:** 2026-04-28
**Tester:** Kimi Code CLI

---

## 1. Service Health

| Service | Port | Status | Notes |
|---------|------|--------|-------|
| PostgreSQL | 5432 | ✅ Healthy | DB responsive, all tables intact |
| Backend API | 3001 | ✅ Running | Rebuilt with `cron` library + tzdata |
| Dashboard | 3005 | ✅ Running | Next.js serving HTML |
| PicoClaw Gateway | 18790 | ✅ Running | WS auth working, v0.2.7 |
| OpenAI Proxy | 18792 | ⚠️ Intermittent | Needs manual restart if crashes |
| WhatsApp | N/A | ❌ Disconnected | QR code pending scan |

---

## 2. REST API Endpoints

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/health` | GET | ✅ 200 OK | Returns `{status: "ok"}` |
| `/api/patients` | GET | ✅ 200 OK | Returns 1 patient (Jiwan) |
| `/api/patients/:id` | GET | ✅ 200 OK | Returns patient + history |
| `/api/patients` | POST | ✅ 400 Bad Request | Validation works (missing fields rejected) |
| `/api/patients/:id` | PUT | ⬜ Not Tested | |
| `/api/patients/:id` | DELETE | ⬜ Not Tested | |
| `/api/compliance` | GET | ✅ 200 OK | Empty (no reminders sent yet) |
| `/api/stats` | GET | ✅ 200 OK | Shows 22 responses, weekly trend |
| `/api/broadcasts` | GET | ✅ 200 OK | Empty array |
| `/api/broadcasts` | POST | ✅ 400 Bad Request | Validation works |
| `/api/wa/status` | GET | ✅ 200 OK | Returns `{status: "qr"}` |
| `/api/wa/events` | GET | ✅ 200 OK | SSE stream ready |
| `/api/wa/restart` | POST | ⬜ Not Tested | |
| `/api/reminders` | GET | ❌ 404 Not Found | **Endpoint does not exist** |
| `/api/responses` | GET | ❌ 404 Not Found | **Endpoint does not exist** |

### Issues
- **No standalone `/api/reminders` or `/api/responses` endpoints.** These are only accessible via `/api/patients/:id/history` or `/api/compliance`.

---

## 3. MCP Endpoints

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/sse` | GET | ✅ 200 OK | SSE transport, Content-Type: text/event-stream |
| `/mcp` | POST | ⚠️ 406 Not Acceptable | May need `Accept: application/json` header |
| `/messages` | POST | ✅ 404 Expected | Returns 404 without valid sessionId (correct) |

---

## 4. Database Integrity

| Check | Result |
|-------|--------|
| Tables exist | ✅ patients, reminders, responses, broadcasts |
| Foreign keys | ✅ All FK constraints in place |
| Unique constraints | ✅ patients.phone, reminders(patient_id, scheduled_date) |
| Check constraints | ✅ responses.answer ∈ {YES, NO, UNCLEAR}, reminders.status ∈ {pending, sent, failed} |
| Referential integrity | ✅ 0 orphan responses |
| Data | 1 active patient (Jiwan), 22 responses, 1 failed reminder record |

---

## 5. Frontend Dashboard

| Page | Status | Notes |
|------|--------|-------|
| `/` (Home) | ✅ 200 OK | HTML served |
| `/api/*` (proxy) | ✅ 200 OK | API proxy working |
| `/whatsapp` | ✅ 200 OK | QR page accessible |

---

## 6. Cron Jobs

| Job | Schedule | Status | Notes |
|-----|----------|--------|-------|
| Dynamic Reminder | Every minute | ✅ Fixed | Uses `cron` library (replaced `node-cron` due to missed executions) |
| Guardian Notify | Every 30 min (10:00-20:00) | ✅ Fixed | Jakarta timezone via `getJakartaTime()` |

### Cron Job History
- **Initial issue:** `node-cron` had continuous "missed execution" warnings
- **Fix:** Replaced with `cron` library + `tzdata` in Dockerfile
- **Behavior:** Now checks `reminder_time` per patient dynamically every minute

---

## 7. PicoClaw Cron Jobs (CLI)

| Job | Schedule | Status |
|-----|----------|--------|
| `reminder-pagi` | `0 8 * * *` | ✅ Added via CLI |
| `notifikasi-wali` | `0 10 * * *` | ✅ Added via CLI |

**Note:** These are stored in `~/.picoclaw/workspace/cron/jobs.json`. The `cron.jobs` section in `config.json` is **NOT read by PicoClaw** — this is by design in v0.2.7.

---

## 8. End-to-End Flow Test

### Chat Flow (PicoClaw → OpenAI → Tools → DB)

| Step | Status | Notes |
|------|--------|-------|
| WS Connect to PicoClaw | ✅ Working | Auth with Bearer token |
| Send message | ✅ Working | |
| PicoClaw calls OpenAI via Proxy | ✅ Working | Proxy injects 8 tools |
| OpenAI returns tool_calls | ⚠️ Intermittent | Sometimes fails to record response |
| Tool executes via MCP | ⚠️ Intermittent | "Sepertinya ada masalah teknis..." |
| Response saved to DB | ⚠️ Intermittent | |

### Last Test Results
- **2026-04-28 10:35:** Response: *"Sepertinya ada masalah dengan pencatatan respons..."* ❌
- **Earlier test:** Response: *"Pesan dari Jiwan telah dicatat..."* ✅

**Likely cause:** MCP server connection may drop after backend restarts. PicoClaw needs to reconnect to MCP server.

---

## 9. WhatsApp Integration

| Component | Status | Notes |
|-----------|--------|-------|
| Baileys library | ✅ Loaded | |
| Session storage | ✅ `wa-session` folder exists | |
| QR Code generation | ✅ Working | Displayed in dashboard |
| Connection status | ❌ Disconnected | **QR code needs to be scanned** |
| Send message API | ⬜ Untested | Will fail until connected |
| Receive message | ⬜ Untested | Will work after connected |

---

## 10. Issues Summary

| # | Severity | Issue | Location | Recommended Fix |
|---|----------|-------|----------|-----------------|
| 1 | 🔴 High | WhatsApp not connected | Backend | Scan QR code at http://localhost:3005/whatsapp |
| 2 | 🔴 High | End-to-end tool calling intermittent | PicoClaw ↔ MCP | Restart PicoClaw after backend restarts to force MCP reconnect |
| 3 | 🟡 Medium | OpenAI Proxy not persistent | `openai-proxy.js` | Add auto-restart or run as Windows service |
| 4 | 🟡 Medium | No `/api/reminders` or `/api/responses` endpoints | `routes.js` | Add dedicated endpoints if dashboard needs them |
| 5 | 🟢 Low | MCP `/mcp` returns 406 | Backend | Check Accept header handling |
| 6 | 🟢 Low | `docker-compose.yml` has obsolete `version` | Root | Remove `version: '3.8'` line |
| 7 | 🟢 Low | PicoClaw prints QR deprecation warning | PicoClaw | Expected, non-critical |

---

## 11. Recommendations

### Immediate Actions
1. **Scan WhatsApp QR code** at http://localhost:3005/whatsapp
2. **Restart PicoClaw** after any backend restart to ensure MCP reconnection:
   ```powershell
   .\stop-aicare.ps1
   .\start-aicare.ps1
   ```
3. **Monitor proxy** — if chat stops working, check port 18792:
   ```powershell
   netstat -ano | findstr 18792
   ```

### Short-term Improvements
1. Add `/api/reminders` and `/api/responses` endpoints for dashboard filtering
2. Make OpenAI Proxy auto-restart on crash (PM2 or Windows Service)
3. Add health check endpoint for Proxy (`/health`)
4. Fix MCP Streamable HTTP 406 error

### Long-term
1. Consider upgrading PicoClaw from v0.2.7 to nightly build (fixes tool calling bug natively)
2. Add monitoring/alerting for cron job failures
3. Implement retry logic for WhatsApp message sending
