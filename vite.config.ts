import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type PlantContext = {
  groups?: Array<{ groupCode: string; code: number; name: string; colour?: string; thickener?: string }>
  equipment?: Array<{
    equipmentId: string
    displayName: string
    type: string
    capacityT?: number
    status: string
    lastGroupCode?: string
    lastBatchId?: string
  }>
  activeBatches?: Array<{
    batchId: string
    gradeId: string
    gradeName?: string
    groupCode: string
    stage: string
    reactorId?: string
    kettleId?: string
    homogeniserId?: string
    fillingPointId?: string
  }>
  recentGrades?: Array<{
    gradeId: string
    name: string
    groupCode: string
    hasDye: boolean
    isBituminous: boolean
    isSynthetic: boolean
    isFoodGrade: boolean
  }>
  compatibilitySummary?: Record<string, number>
}

const NVIDIA_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions'
const MODEL = 'google/diffusiongemma-26b-a4b-it'
const BASE_SYSTEM_PROMPT = `You are an AI assistant for the Grease Plant Routing System.
You help plant operators with:
- Product group compatibility and routing decisions
- Equipment selection and cleaning requirements
- Understanding batch stages (Reactor -> Kettle -> Homogeniser -> Filling Point)
- Dye/colour product handling and flush requirements
- Borderline compatibility situations and QC consultation
- General grease manufacturing process guidance

Key rules:
- 25 product groups (G01-G25) based on thickener type and colour
- Compatibility: SAME/COMPATIBLE = no clean, BORDERLINE = QC consult required, INCOMPATIBLE = must clean kettle
- Dye products require DYE_FLUSH on kettle, homogeniser, and filling point after batch
- Synthetic/polyurea greases need dedicated equipment
- Food grade greases need exclusive facility free from mineral oils
- Kettle wash from incompatible changeover: collect in barrel, use for Servo Grease C or consult QC

Be concise and practical. This is a plant control room assistant.`

function fmtList<T>(items: T[] | undefined, render: (item: T) => string, fallback = 'None') {
  if (!items?.length) return fallback
  return items.map(render).join('\n')
}

function buildSystemPrompt(ctx?: PlantContext) {
  const equipment = ctx?.equipment ?? []
  const byType = (type: string) => equipment.filter((eq) => eq.type === type)
  const equipmentLine = (eq: NonNullable<PlantContext['equipment']>[number]) =>
    `- ${eq.equipmentId} ${eq.displayName}: ${eq.status}${eq.capacityT ? `, ${eq.capacityT}t` : ''}${eq.lastGroupCode ? `, last ${eq.lastGroupCode}` : ''}${eq.lastBatchId ? `, batch ${eq.lastBatchId}` : ''}`

  const activeBatches = fmtList(ctx?.activeBatches, (batch) =>
    `- ${batch.batchId}: ${batch.gradeId}${batch.gradeName ? ` ${batch.gradeName}` : ''}, ${batch.groupCode}, stage ${batch.stage}, route ${batch.reactorId ?? '?'} > ${batch.kettleId ?? '?'} > ${batch.homogeniserId ?? '?'} > ${batch.fillingPointId ?? '?'}`
  )
  const groups = fmtList(ctx?.groups, (group) =>
    `- ${group.groupCode}: ${group.name}${group.colour ? ` [${group.colour}]` : ''}${group.thickener ? `, ${group.thickener}` : ''}`
  )
  const grades = fmtList(ctx?.recentGrades, (grade) => {
    const flags = [
      grade.hasDye ? 'DYE' : '',
      grade.isBituminous ? 'BITUMINOUS' : '',
      grade.isSynthetic ? 'SYNTHETIC' : '',
      grade.isFoodGrade ? 'FOOD' : '',
    ].filter(Boolean)
    return `- ${grade.gradeId}: ${grade.name}, ${grade.groupCode}${flags.length ? ` (${flags.join(', ')})` : ''}`
  })
  const counts = ctx?.compatibilitySummary
    ? Object.entries(ctx.compatibilitySummary).map(([relation, count]) => `${relation}: ${count}`).join(', ')
    : 'Matrix summary unavailable'

  return `${BASE_SYSTEM_PROMPT}

Live plant context:

Reactors:
${fmtList(byType('REACTOR'), equipmentLine)}

Kettles:
${fmtList(byType('KETTLE'), equipmentLine)}

Homogenisers:
${fmtList(byType('HOMOGENISER'), equipmentLine)}

Filling points:
${fmtList(byType('FILLING_POINT'), equipmentLine)}

Active batches:
${activeBatches}

Product groups:
${groups}

Known active/recent grades:
${grades}

Compatibility matrix counts:
${counts}

Rules for answers:
- You are read-only. Do not claim to start batches, change status, edit matrix cells, or delete data.
- Cite exact grade codes, group codes, equipment IDs, and batch IDs when relevant.
- If local context is insufficient for a specific grade or matrix cell, say that and direct the operator to the appropriate tab.`
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

async function proxyNvidiaChat(req: IncomingMessage, res: ServerResponse, apiKey: string | undefined) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' })
    return
  }

  if (!apiKey) {
    sendJson(res, 500, { error: 'NVIDIA_API_KEY is not configured on the server.' })
    return
  }

  let messages: ChatMessage[]
  let plantContext: PlantContext | undefined
  try {
    const parsed = JSON.parse(await readBody(req)) as { messages?: ChatMessage[]; plantContext?: PlantContext }
    messages = Array.isArray(parsed.messages) ? parsed.messages : []
    plantContext = parsed.plantContext
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON request body.' })
    return
  }

  const upstream = await fetch(NVIDIA_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'user', content: buildSystemPrompt(plantContext) },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      max_tokens: 4096,
      temperature: 1.0,
      top_p: 0.95,
      stream: true,
      chat_template_kwargs: { enable_thinking: true },
    }),
  })

  if (!upstream.ok || !upstream.body) {
    const errorText = await upstream.text().catch(() => `HTTP ${upstream.status}`)
    sendJson(res, upstream.status || 502, {
      error: `NVIDIA API error ${upstream.status}: ${errorText.slice(0, 240)}`,
    })
    return
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  const reader = upstream.body.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    res.write(Buffer.from(value))
  }
  res.end()
}

function nvidiaChatProxy(apiKey: string | undefined): Plugin {
  return {
    name: 'nvidia-chat-proxy',
    configureServer(server) {
      server.middlewares.use('/api/chat', (req, res) => {
        void proxyNvidiaChat(req, res, apiKey).catch((error: unknown) => {
          const message = error instanceof Error ? error.message : 'AI proxy failed.'
          if (res.headersSent) {
            res.end()
            return
          }
          sendJson(res, 502, { error: message })
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const nvidiaApiKey = env.NVIDIA_API_KEY ?? env.VITE_NVIDIA_API_KEY

  return {
    plugins: [react(), nvidiaChatProxy(nvidiaApiKey)],
    server: {
      port: 5173,
      headers: {
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "connect-src 'self' wss: https: http://localhost:*",
          "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com https://*.firebase.com",
          "img-src 'self' data: https:",
        ].join('; '),
      },
    },
  }
})
