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

  async connect() {
    if (this.sock) {
      this.sock.ev.removeAllListeners()
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
        printQRInTerminal: true,
        syncFullHistory: false,
        markOnlineOnConnect: false,
        keepAliveIntervalMs: 30000,
        defaultQueryTimeoutMs: 60000,
        logger: {
          level: 'silent',
          trace() {}, debug() {}, info() {},
          warn(obj, msg) { if (msg?.includes('error')) console.warn('[WA]', msg) },
          error(obj, msg) { console.error('[WA]', msg || obj) },
          fatal() {}, child() { return this }
        },
      })

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
          const shouldReconnect = (lastDisconnect?.error instanceof Boom)
            ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
            : true

          const code = lastDisconnect?.error?.output?.statusCode
          console.log(`[WA] Disconnected, code: ${code}, reconnect: ${shouldReconnect}, attempts: ${this._reconnectAttempts}`)

          this._setState('disconnected')

          if (shouldReconnect && this._reconnectAttempts < this._maxReconnectAttempts) {
            this._reconnectAttempts++
            const delay = Math.min(this._reconnectAttempts * 2000, 15000)
            console.log(`[WA] Reconnecting in ${delay}ms...`)
            setTimeout(() => this.connect(), delay)
          } else if (this._reconnectAttempts >= this._maxReconnectAttempts) {
            console.log('[WA] Max reconnect attempts reached. Manual restart required.')
            this._setState('qr', null)
          }
        }
      })

      this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return
        for (const msg of messages) {
          if (msg.key.fromMe) continue
          const phone = msg.key.remoteJid?.replace('@s.whatsapp.net', '').replace('@c.us', '')
          if (!phone) continue
          const text = msg.message?.conversation
            ?? msg.message?.extendedTextMessage?.text
            ?? null
          if (!text) continue
          this.emit('message', { phone, text, jid: msg.key.remoteJid })
        }
      })
    } catch (err) {
      console.error('[WA] Connection error:', err.message)
      this._setState('disconnected')
    }
  }

  async sendMessage(jid, content) {
    if (!this.sock || this.status !== 'connected') {
      throw new Error('WhatsApp not connected')
    }
    if (typeof content === 'string') {
      await this.sock.sendMessage(jid, { text: content })
    } else if (content.image) {
      await this.sock.sendMessage(jid, { image: content.image, caption: content.caption ?? '' })
    } else {
      throw new Error('Unsupported message content type')
    }
  }

  async disconnect() {
    if (this.sock) {
      try { await this.sock.ws.close() } catch {}
      this.sock.ev.removeAllListeners()
      this.sock = null
    }
    this._setState('disconnected')
  }

  async reconnect() {
    this._reconnectAttempts = 0
    await this.disconnect()
    setTimeout(() => this.connect(), 1000)
  }
}

export const waService = new WhatsAppService()
