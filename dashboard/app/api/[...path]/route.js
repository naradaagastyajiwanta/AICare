const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:3001'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const maxDuration = 3600

async function proxy(req, { params }) {
  const path = (await params).path.join('/')
  const search = new URL(req.url).search
  const url = `${BACKEND}/api/${path}${search}`

  const contentType = req.headers.get('content-type') ?? ''
  const isSse = (req.headers.get('accept') ?? '').includes('text/event-stream')
  const isMultipart = contentType.includes('multipart/form-data')

  const headers = {}
  if (isSse) headers['Accept'] = 'text/event-stream'
  // Don't override Content-Type for multipart — let the browser set the boundary
  if (!isMultipart) headers['Content-Type'] = 'application/json'

  const init = { method: req.method, headers, cache: 'no-store' }
  // For GET requests, forward the client abort signal so navigation cancels the fetch.
  // For mutating requests, use an independent 5-minute timeout — the backend must be
  // allowed to finish even if the browser disconnects (e.g. bulk embedding 200+ chunks).
  init.signal = (req.method === 'GET' && req.signal)
    ? req.signal
    : AbortSignal.timeout(300_000)

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (isMultipart) {
      // Forward raw body as stream so multer on the backend receives proper multipart
      init.body = req.body
      init.duplex = 'half'
      // Forward the original Content-Type including the boundary
      init.headers['Content-Type'] = contentType
    } else {
      init.body = await req.text()
    }
  }

  const res = await fetch(url, init)
  const resContentType = res.headers.get('Content-Type') ?? 'application/json'

  if (resContentType.includes('text/event-stream')) {
    return new Response(res.body, {
      status: res.status,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  }

  const body = await res.text()
  return new Response(body, {
    status: res.status,
    headers: { 'Content-Type': resContentType },
  })
}

export const GET    = proxy
export const POST   = proxy
export const PUT    = proxy
export const PATCH  = proxy
export const DELETE = proxy
