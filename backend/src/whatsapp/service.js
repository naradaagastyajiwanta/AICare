import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import path from 'path'
import { fileURLToPath } from 'url'
import QRCode from 'qrcode'
import { EventEmitter } from 'events'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SESSION_DIR = path.resolve(__dirname, '../../wa-session')

class WhatsAppService extends EventEmitter {
  constructor() {
    super()
    this.sock = null
    this.status = 'disconnected'
    this.qrDataUrl = null
    this._clients = new Set()
    this._reconnectAttempts = 0
    this._maxReconnectAttempts = 10
    this._connecting = false       // guard against concurrent connect() calls
    this._heartbeatTimer = null
    this._reconnectTimer = null    // track pending reconnect so we can cancel it
  }

  get state() {
    return { status: this.status, qrDataUrl: this.qrDataUrl }
  }

  addSseClient(res) {
    this._clients.add(res)
    res.on('close', () => this._clients.delete(res))
    this._send(res, this.state)
    this._ensureHeartbeat()
  }

  _broadcast(data) {
    const msg = `data: ${JSON.stringify(data)}\n\n`
    for (const res of this._clients) {
      try { res.write(msg) } catch {}
    }
  }

  _send(res, data) {
    try { res.write(`data: ${JSON.stringify(data)}\n\n`) } catch {}
  }

  // Periodic SSE comment lines keep proxies (Next.js / undici) and reverse
  // proxies from killing the connection on idle body timeout (~5 min default).
  _ensureHeartbeat() {
    if (this._heartbeatTimer) return
    this._heartbeatTimer = setInterval(() => {
      if (this._clients.size === 0) {
        clearInterval(this._heartbeatTimer)
        this._heartbeatTimer = null
        return
      }
      for (const res of this._clients) {
        try { res.write(`: keepalive ${Date.now()}\n\n`) } catch {}
      }
    }, 25_000)
  }

  _setState(status, qrDataUrl = null) {
    this.status = status
    this.qrDataUrl = qrDataUrl
    this._broadcast(this.state)
  }

  _hasSessionFiles() {
    try {
      return fs.existsSync(SESSION_DIR) && fs.readdirSync(SESSION_DIR).length > 0
    } catch {
      return false
    }
  }

  _clearSession() {
    try {
      if (fs.existsSync(SESSION_DIR)) {
        for (const f of fs.readdirSync(SESSION_DIR)) {
          fs.rmSync(path.join(SESSION_DIR, f), { recursive: true, force: true })
        }
        console.log('[WA] Session files cleared')
      }
    } catch (err) {
      console.error('[WA] Failed to clear session:', err.message)
    }
  }

  _cancelPendingReconnect() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer)
      this._reconnectTimer = null
    }
  }

  _scheduleReconnect(delayMs) {
    this._cancelPendingReconnect()
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null
      this.connect()
    }, delayMs)
  }

  async connect() {
    // Prevent concurrent connect() calls during async setup
    if (this._connecting) {
      console.log('[WA] Connect already in progress, skipping')
      return
    }
    this._connecting = true

    // Tear down any existing socket cleanly — remove listeners first to
    // prevent stale connection.update events from firing during ws.close()
    if (this.sock) {
      this.sock.ev.removeAllListeners()
      try { await this.sock.ws.close() } catch {}
      this.sock = null
    }

    try {
      const hasSession = this._hasSessionFiles()
      console.log(`[WA] Connecting... session files: ${hasSession ? 'yes' : 'no'}`)

      const { version } = await fetchLatestBaileysVersion()
      const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)

      this.sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        syncFullHistory: false,
        markOnlineOnConnect: false,
        keepAliveIntervalMs: 15_000,      // ping every 15s — keeps NAT alive and detects drops faster
        connectTimeoutMs: 30_000,
        defaultQueryTimeoutMs: 60_000,
        retryRequestDelayMs: 500,
        logger: {
          level: 'silent',
          trace() {}, debug() {}, info() {},
          warn(obj, msg) { if (msg?.includes('error')) console.warn('[WA]', msg) },
          error(obj, msg) { console.error('[WA]', msg || obj) },
          fatal() {}, child() { return this }
        },
      })

      // Mark as no longer in initial setup — events can now drive reconnection
      this._connecting = false

      this.sock.ev.on('creds.update', saveCreds)

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update

        if (qr) {
          const dataUrl = await QRCode.toDataURL(qr, { width: 256, margin: 2 })
          this._setState('qr', dataUrl)
          console.log('[WA] QR code ready — scan in dashboard at /whatsapp')
        }

        if (connection === 'open') {
          this._reconnectAttempts = 0
          this._setState('connected')
          console.log('[WA] Connected')
        }

        if (connection === 'close') {
          const code = (lastDisconnect?.error instanceof Boom)
            ? lastDisconnect.error.output?.statusCode
            : lastDisconnect?.error?.output?.statusCode

          const isLoggedOut  = code === DisconnectReason.loggedOut
          const isBadSession = code === DisconnectReason.badSession
          const isReplaced   = code === DisconnectReason.connectionReplaced
          const isForbidden  = code === DisconnectReason.forbidden

          console.log(`[WA] Disconnected, code: ${code}, attempts: ${this._reconnectAttempts}`)

          if (isLoggedOut || isBadSession) {
            // Session invalidated — clear saved creds so next connect shows a fresh QR
            this._clearSession()
            this._reconnectAttempts = 0
            this._setState('disconnected')
            console.log('[WA] Session cleared. Reconnecting for fresh QR...')
            this._scheduleReconnect(2000)
            return
          }

          if (isReplaced) {
            // Another device opened the same WhatsApp session — don't auto-reconnect,
            // user must manually restart to avoid a reconnect loop between two processes.
            this._setState('disconnected')
            console.log('[WA] Connection replaced by another device. Use the restart button to reconnect.')
            return
          }

          if (isForbidden) {
            // Number banned or restricted by WhatsApp
            this._setState('stopped')
            console.log('[WA] Account forbidden (banned/restricted). Manual intervention required.')
            return
          }

          // Transient disconnect — exponential backoff
          this._setState('disconnected')

          if (this._reconnectAttempts < this._maxReconnectAttempts) {
            this._reconnectAttempts++
            const delay = Math.min(this._reconnectAttempts * 2000, 15_000)
            console.log(`[WA] Reconnecting in ${delay}ms (attempt ${this._reconnectAttempts}/${this._maxReconnectAttempts})...`)
            this._scheduleReconnect(delay)
          } else {
            console.log('[WA] Max reconnect attempts reached. Manual restart required.')
            this._setState('stopped')
          }
        }
      })

      this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return
        for (const msg of messages) {
          if (msg.key.fromMe) continue
          // Ignore group chats — only handle individual (private) messages
          if (msg.key.remoteJid?.endsWith('@g.us')) continue
          const phone = msg.key.remoteJid?.replace('@s.whatsapp.net', '').replace('@c.us', '')
          if (!phone) continue
          const text = msg.message?.conversation
            ?? msg.message?.extendedTextMessage?.text
            ?? null
          if (!text) continue

          // Mark message as read (blue double tick)
          try { await this.sock.readMessages([msg.key]) } catch {}
          // Show typing indicator while processing
          try { await this.sock.sendPresenceUpdate('composing', msg.key.remoteJid) } catch {}

          this.emit('message', { phone, text, jid: msg.key.remoteJid })
        }
      })

    } catch (err) {
      this._connecting = false
      console.error('[WA] Connection error:', err.message)

      // Retry with backoff instead of giving up permanently
      if (this._reconnectAttempts < this._maxReconnectAttempts) {
        this._reconnectAttempts++
        const delay = Math.min(this._reconnectAttempts * 2000, 15_000)
        this._setState('disconnected')
        console.log(`[WA] Retrying after error in ${delay}ms (attempt ${this._reconnectAttempts}/${this._maxReconnectAttempts})...`)
        this._scheduleReconnect(delay)
      } else {
        this._setState('stopped')
      }
    }
  }

  async sendMessage(jid, content) {
    if (!this.sock || this.status !== 'connected') {
      throw new Error('WhatsApp not connected')
    }
    // Stop typing indicator — fire-and-forget to avoid blocking the send
    this.sock.sendPresenceUpdate('paused', jid).catch(() => {})

    if (typeof content === 'string') {
      await this.sock.sendMessage(jid, { text: content })
    } else if (content.image) {
      await this.sock.sendMessage(jid, { image: content.image, caption: content.caption ?? '' })
    } else {
      throw new Error('Unsupported message content type')
    }
  }

  async stopTyping(jid) {
    if (!this.sock || this.status !== 'connected') return
    try { await this.sock.sendPresenceUpdate('paused', jid) } catch {}
  }

  async disconnect() {
    this._cancelPendingReconnect()
    if (this.sock) {
      // Remove listeners first so no stale events fire during ws.close()
      this.sock.ev.removeAllListeners()
      try { await this.sock.ws.close() } catch {}
      this.sock = null
    }
    this._connecting = false
    this._setState('disconnected')
  }

  // Normal reconnect — preserves existing session (no QR if session still valid)
  async reconnect() {
    this._reconnectAttempts = 0
    this._setState('starting')
    await this.disconnect()
    this._scheduleReconnect(1000)
  }

  // Force a fresh QR by clearing session files before reconnecting
  async logout() {
    this._reconnectAttempts = 0
    this._setState('starting')
    await this.disconnect()
    this._clearSession()
    this._scheduleReconnect(500)
  }
}

export const waService = new WhatsAppService()
