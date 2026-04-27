import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { setupMcpTools } from './mcp/server.js'
import apiRoutes from './api/routes.js'

const app = express()
app.use(cors())
app.use(express.json())

// REST API for dashboard
app.use('/api', apiRoutes)

// MCP Server (SSE transport — PicoClaw connects via HTTP)
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

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => {
  console.log(`AICare backend  : http://localhost:${PORT}`)
  console.log(`MCP SSE endpoint: http://localhost:${PORT}/sse`)
  console.log(`REST API        : http://localhost:${PORT}/api`)
})
