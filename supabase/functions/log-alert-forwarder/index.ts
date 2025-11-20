import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

export const config = {
  auth: {
    verify_jwt: false,
  },
}

type LogRecord = {
  event_message?: string
  level?: string
  metadata?: Record<string, unknown>
  timestamp?: string
  source?: string
}

async function postToSlack(message: string) {
  const webhook = Deno.env.get('LOG_ALERT_SLACK_WEBHOOK')
  if (!webhook) {
    console.error('[log-alert-forwarder] Missing LOG_ALERT_SLACK_WEBHOOK env')
    return new Response('Missing webhook', { status: 500, headers: corsHeaders })
  }
  const body = { text: message }
  const resp = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    console.error('[log-alert-forwarder] Failed to post to Slack', await resp.text())
  }
}

function formatRecord(record: LogRecord) {
  const level = (record.level || 'info').toUpperCase()
  const at = record.timestamp || new Date().toISOString()
  const msg = record.event_message || '(no event message)'
  const src = record.source ? ` source=${record.source}` : ''
  const meta = record.metadata ? ` metadata=${JSON.stringify(record.metadata).slice(0, 500)}` : ''
  return `[$${level}] ${msg}${src} at ${at}${meta}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let payload: any = {}
  try {
    payload = await req.json()
  } catch (err) {
    console.error('[log-alert-forwarder] Invalid JSON', err)
    return new Response('Invalid JSON', { status: 400, headers: corsHeaders })
  }

  const records: LogRecord[] = Array.isArray(payload?.records)
    ? payload.records
    : payload?.record
    ? [payload.record]
    : []

  if (records.length === 0) {
    return new Response('No records', { headers: corsHeaders })
  }

  const noteworthy = records.filter((record) => {
    const level = (record.level || '').toLowerCase()
    return ['error', 'critical', 'alert', 'fatal'].includes(level)
  })

  if (noteworthy.length === 0) {
    return new Response('Ignored (noise)', { headers: corsHeaders })
  }

  const message = noteworthy
    .map((rec) => formatRecord(rec))
    .slice(0, 5)
    .join('\n')

  await postToSlack(`🚨 Supabase log alert\n${message}`)

  return new Response('Forwarded', { headers: corsHeaders })
})
