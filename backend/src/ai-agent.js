import OpenAI from 'openai'
import { db } from './db/index.js'
import { upsertDailyScore } from './mcp/server.js'
import { retrieveRelevantKnowledge, formatKnowledgeContext } from './rag.js'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'record_activity_report',
      description: 'Catat laporan aktivitas fisik pasien hari ini',
      parameters: {
        type: 'object',
        properties: {
          activity_count: {
            type: 'integer',
            description: 'Jumlah sesi aktivitas fisik (1, 2, atau 3)',
          },
        },
        required: ['activity_count'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'record_diet_report',
      description: 'Catat laporan makan/diet pasien hari ini',
      parameters: {
        type: 'object',
        properties: {
          ate_healthy: {
            type: 'boolean',
            description: 'true jika pasien makan sehat/bergizi, false jika belum makan atau tidak sehat',
          },
        },
        required: ['ate_healthy'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'record_medication_response',
      description: 'Catat konfirmasi minum obat pasien. HANYA gunakan jika kamu sendiri baru menanyakan apakah pasien sudah minum obat dan jawabannya ambigu.',
      parameters: {
        type: 'object',
        properties: {
          answer: {
            type: 'string',
            enum: ['YES', 'NO', 'UNCLEAR'],
            description: 'Jawaban pasien',
          },
        },
        required: ['answer'],
      },
    },
  },
]

async function executeTool(toolName, args, patientId) {
  switch (toolName) {
    case 'record_activity_report': {
      const count = Math.max(1, Math.min(10, args.activity_count ?? 1))
      await db.query(
        'INSERT INTO responses (patient_id, answer, activity_count, raw_message, response_type) VALUES ($1, $2, $3, $4, $5)',
        [patientId, 'YES', count, `[ai] activity=${count}`, 'activity']
      )
      await upsertDailyScore(patientId)
      return { success: true, recorded: { activity_count: count } }
    }

    case 'record_diet_report': {
      const healthy = args.ate_healthy ?? true
      await db.query(
        'INSERT INTO responses (patient_id, answer, ate_healthy, raw_message, response_type) VALUES ($1, $2, $3, $4, $5)',
        [patientId, healthy ? 'YES' : 'NO', healthy, `[ai] diet=${healthy}`, 'diet']
      )
      await upsertDailyScore(patientId)
      return { success: true, recorded: { ate_healthy: healthy } }
    }

    case 'record_medication_response': {
      const answer = args.answer ?? 'UNCLEAR'
      const reminderRes = await db.query(
        `SELECT id FROM reminders WHERE patient_id = $1 AND scheduled_date = (NOW() AT TIME ZONE 'Asia/Jakarta')::date AND category = 'medication'`,
        [patientId]
      )
      const reminderId = reminderRes.rows[0]?.id ?? null
      await db.query(
        'INSERT INTO responses (patient_id, reminder_id, answer, raw_message, response_type) VALUES ($1, $2, $3, $4, $5)',
        [patientId, reminderId, answer, `[ai] medication=${answer}`, 'medication']
      )
      await upsertDailyScore(patientId)
      return { success: true, recorded: { answer } }
    }

    default:
      return { error: `Unknown tool: ${toolName}` }
  }
}

function buildSystemPrompt(patient) {
  return `Kamu adalah AICare, asisten kesehatan dari Posyandu yang ramah dan suportif.

Pasien yang sedang berbicara dengan kamu:
- Nama: ${patient.name}
- Obat: ${patient.medicine_name}

PENTING — Pembagian tugas:
Backend sistem sudah menangani deteksi konfirmasi obat (SUDAH/BELUM) sebelum pesan sampai ke kamu.
Artinya pesan yang kamu terima BUKAN konfirmasi obat biasa. Jenis pesan yang mungkin:

1. LAPORAN AKTIVITAS FISIK ("sudah jalan pagi", "olahraga 2x", "senam tadi")
   → Panggil record_activity_report, lalu balas dengan pujian singkat.

2. LAPORAN MAKAN/DIET ("sudah sarapan sehat", "makan sayur", "belum sarapan")
   → Panggil record_diet_report, lalu balas sesuai konteks.

3. PERTANYAAN KESEHATAN ("kenapa batuk saya lama?", "obat ini aman?", "efek samping apa?")
   → JAWAB dengan informasi konkret dan berguna. Jangan hanya beri semangat kosong.
   → Jangan panggil tool apapun.

4. CHAT UMUM / SAPAAN ("halo", "apa kabar", "selamat pagi")
   → Balas ramah dan natural. Jangan panggil tool apapun.

Aturan:
- Gunakan Bahasa Indonesia yang ramah
- Maksimal 3-4 kalimat per balasan
- Jangan menghakimi pasien`
}

export async function handleWithAI(patient, text) {
  // Retrieve relevant knowledge in parallel with no blocking — gracefully degrades to [] on error
  const knowledgeDocs = await retrieveRelevantKnowledge(text)
  const knowledgeContext = formatKnowledgeContext(knowledgeDocs)

  if (knowledgeDocs.length > 0) {
    console.log(`[RAG] Injecting ${knowledgeDocs.length} doc(s) for: "${text.slice(0, 60)}"`)
  }

  const messages = [
    { role: 'system', content: buildSystemPrompt(patient) + knowledgeContext },
    { role: 'user', content: text },
  ]

  // Agentic loop: run until no more tool calls
  for (let i = 0; i < 5; i++) {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 512,
    })

    const choice = response.choices[0]
    messages.push(choice.message)

    if (!choice.message.tool_calls || choice.message.tool_calls.length === 0) {
      return choice.message.content?.trim() ?? ''
    }

    // Execute all tool calls in parallel
    const toolResults = await Promise.all(
      choice.message.tool_calls.map(async (tc) => {
        let args
        try { args = JSON.parse(tc.function.arguments) } catch { args = {} }
        console.log(`[AI] Tool call: ${tc.function.name}`, args)
        const result = await executeTool(tc.function.name, args, patient.id)
        return {
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        }
      })
    )

    messages.push(...toolResults)
  }

  return 'Maaf, saya tidak dapat memproses pesan ini. Silakan coba lagi.'
}
