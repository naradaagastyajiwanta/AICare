import OpenAI from 'openai'
import { db } from './db/index.js'
import mammoth from 'mammoth'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const EMBEDDING_MODEL = 'text-embedding-3-small'
const TOP_K           = 3
const MIN_SIMILARITY  = 0.50  // only inject docs above this threshold

// ─── Vector math ─────────────────────────────────────────────────────────────

function dotProduct(a, b) {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i]
  return sum
}

function magnitude(v) {
  return Math.sqrt(v.reduce((s, x) => s + x * x, 0))
}

function cosineSimilarity(a, b) {
  const mag = magnitude(a) * magnitude(b)
  return mag === 0 ? 0 : dotProduct(a, b) / mag
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateEmbedding(text) {
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.trim().slice(0, 8000), // stay within token limit
  })
  return res.data[0].embedding
}

/**
 * Find the most relevant knowledge base entries for a given query.
 * Returns [] if nothing exceeds the similarity threshold, so the caller
 * can safely skip injecting context rather than hallucinating relevance.
 */
export async function retrieveRelevantKnowledge(query) {
  let queryEmbedding
  try {
    queryEmbedding = await generateEmbedding(query)
  } catch (err) {
    console.error('[RAG] Embedding generation failed:', err.message)
    return []
  }

  let rows
  try {
    const result = await db.query(
      'SELECT id, title, content, category, embedding FROM knowledge_base WHERE is_active = true AND embedding IS NOT NULL'
    )
    rows = result.rows
  } catch (err) {
    console.error('[RAG] DB query failed:', err.message)
    return []
  }

  if (rows.length === 0) return []

  const scored = rows
    .map(row => ({
      title:    row.title,
      content:  row.content,
      category: row.category,
      score:    cosineSimilarity(queryEmbedding, row.embedding),
    }))
    .filter(r => r.score >= MIN_SIMILARITY)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K)

  return scored
}

/**
 * Format retrieved docs into a compact context block for the system prompt.
 * Each doc is capped at 400 chars to avoid bloating the context window.
 */
export function formatKnowledgeContext(docs) {
  if (docs.length === 0) return ''
  const items = docs.map((d, i) =>
    `[${i + 1}] ${d.title}\n${d.content.slice(0, 400)}${d.content.length > 400 ? '...' : ''}`
  )
  return `\nPENGETAHUAN RELEVAN (gunakan ini untuk menjawab):\n${items.join('\n\n')}`
}

// ─── DOCX Parsing & Chunking ──────────────────────────────────────────────────

const CHUNK_MIN  = 80   // chars — skip lines that are too short (headers, page numbers)
const CHUNK_MAX  = 800  // chars — split paragraphs that are too long

/**
 * Split a long paragraph at the last sentence boundary before CHUNK_MAX.
 */
function splitLongParagraph(text) {
  const chunks = []
  let remaining = text
  while (remaining.length > CHUNK_MAX) {
    // Find last sentence-ending punctuation before the limit
    const slice = remaining.slice(0, CHUNK_MAX)
    const lastBreak = Math.max(
      slice.lastIndexOf('. '),
      slice.lastIndexOf('! '),
      slice.lastIndexOf('? '),
      slice.lastIndexOf('\n'),
    )
    const cutAt = lastBreak > CHUNK_MIN ? lastBreak + 1 : CHUNK_MAX
    chunks.push(remaining.slice(0, cutAt).trim())
    remaining = remaining.slice(cutAt).trim()
  }
  if (remaining.length >= CHUNK_MIN) chunks.push(remaining)
  return chunks
}

/**
 * Extract text from a DOCX buffer and split into chunks suitable for RAG.
 * Returns array of { title, content } — one entry per chunk.
 * The docName is used to generate chunk titles (e.g. "Nama File - Bagian 3").
 */
export async function parseDocxToChunks(buffer, docName) {
  const { value: rawText } = await mammoth.extractRawText({ buffer })

  // Split on blank lines (paragraph separators)
  const paragraphs = rawText
    .split(/\n{2,}/)
    .map(p => p.replace(/\n/g, ' ').trim())
    .filter(p => p.length >= CHUNK_MIN)

  const chunks = []
  for (const para of paragraphs) {
    if (para.length <= CHUNK_MAX) {
      chunks.push(para)
    } else {
      chunks.push(...splitLongParagraph(para))
    }
  }

  // Build title from first ~60 chars of each chunk for easy identification
  return chunks.map((content, i) => {
    const firstLine = content.split(/[.!?\n]/)[0].trim().slice(0, 60)
    const title = firstLine.length > 10
      ? firstLine
      : `${docName} — Bagian ${i + 1}`
    return { title, content }
  })
}
