import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads')
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true })
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { setupMcpTools } from './mcp/server.js'
import apiRoutes from './api/routes.js'
import { waService } from './whatsapp/service.js'
import { startCronJobs } from './cron/reminder.js'
import { handleChatMessage } from './chat-handler.js'

const app = express()
app.use(cors())
app.use(express.json())

// Serve uploaded images
app.use('/uploads', express.static(UPLOADS_DIR))

// REST API for dashboard
app.use('/api', apiRoutes)

// MCP Server — SSE transport
const mcpServer = new McpServer({ name: 'aicare', version: '1.0.0' })
setupMcpTools(mcpServer)

const transports = new Map()

app.get('/sse', async (req, res) => {
  const transport = new SSEServerTransport('/messages', res)
  transports.set(transport.sessionId, transport)
  res.on('close', () => transports.delete(transport.sessionId))
  await mcpServer.connect(transport)
})

app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId
  const transport = transports.get(sessionId)
  if (!transport) return res.status(404).json({ error: 'MCP session not found' })
  await transport.handlePostMessage(req, res, req.body)
})

// MCP Streamable HTTP (modern transport)
app.all('/mcp', async (req, res) => {
  const accept = req.headers['accept'] ?? ''
  if (!accept.includes('application/json') || !accept.includes('text/event-stream')) {
    req.headers['accept'] = 'application/json, text/event-stream'
  }
  try {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    const server = new McpServer({ name: 'aicare', version: '1.0.0' })
    setupMcpTools(server)
    await server.connect(transport)
    await transport.handleRequest(req, res, req.body)
  } catch (err) {
    console.error('[mcp] /mcp handler error:', err.message)
    if (!res.headersSent) res.status(500).json({ error: err.message })
  }
})

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => {
  console.log(`AICare backend  : http://localhost:${PORT}`)
  console.log(`MCP SSE endpoint: http://localhost:${PORT}/sse`)
  console.log(`REST API        : http://localhost:${PORT}/api`)

  waService.connect()
  startCronJobs(waService)

  // Debounce: accumulate rapid messages from the same user, process as one
  const DEBOUNCE_MS = 1500
  const pending = new Map() // phone → { timer, texts[], jid }

  waService.on('message', ({ phone, text, jid }) => {
    if (pending.has(phone)) {
      const entry = pending.get(phone)
      clearTimeout(entry.timer)
      entry.texts.push(text)
    } else {
      pending.set(phone, { texts: [text], jid })
    }

    const entry = pending.get(phone)
    entry.timer = setTimeout(async () => {
      pending.delete(phone)
      const combined = entry.texts.join('\n')
      console.log(`[WA] Processing ${entry.texts.length} msg(s) from ${phone}: ${combined}`)
      try {
        const reply = await handleChatMessage(phone, combined, waService)
        if (reply) await waService.sendMessage(entry.jid, reply)
        else await waService.stopTyping(entry.jid)
      } catch (err) {
        console.error('[WA] Failed to handle message:', err.message)
        await waService.stopTyping(entry.jid)
        try {
          await waService.sendMessage(entry.jid, 'Maaf, sistem sedang sibuk. Mohon coba lagi beberapa saat.')
        } catch {}
      }
    }, DEBOUNCE_MS)
  })
})
