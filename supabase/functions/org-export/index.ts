import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

export const config = {
  auth: {
    verify_jwt: true,
  },
}

type Scope = 'audits' | 'branches' | 'zones' | 'users'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response('Server not configured', { status: 500, headers: corsHeaders })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON body', { status: 400, headers: corsHeaders })
  }

  const orgId: string | undefined = body?.org_id
  const scopeInput: Scope[] | undefined = Array.isArray(body?.scope) ? body.scope : undefined
  const reason: string | undefined = body?.reason

  if (!orgId) {
    return new Response('org_id is required', { status: 400, headers: corsHeaders })
  }

  const scopes: Scope[] = (scopeInput && scopeInput.length > 0) ? Array.from(new Set(scopeInput)) : ['audits', 'branches', 'zones', 'users']

  const authHeader = req.headers.get('Authorization') || ''
  const jwt = authHeader.replace('Bearer ', '')
  const { data: userRes, error: userErr } = await admin.auth.getUser(jwt)
  if (userErr || !userRes?.user) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  const requestUserId = userRes.user.id

  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single()
  if (orgErr || !org) {
    return new Response('Organization not found', { status: 404, headers: corsHeaders })
  }

  const exportPayload: Record<string, unknown> = {
    organization: org,
  }

  if (scopes.includes('branches')) {
    const { data, error } = await admin.from('branches').select('*').eq('org_id', orgId)
    if (error) return new Response(`Failed to fetch branches: ${error.message}`, { status: 500, headers: corsHeaders })
    exportPayload.branches = data || []
  }

  if (scopes.includes('zones')) {
    const { data, error } = await admin.from('zones').select('*, zone_branches(*)').eq('org_id', orgId)
    if (error) return new Response(`Failed to fetch zones: ${error.message}`, { status: 500, headers: corsHeaders })
    exportPayload.zones = data || []
  }

  if (scopes.includes('users')) {
    const { data, error } = await admin.from('users').select('*').eq('org_id', orgId)
    if (error) return new Response(`Failed to fetch users: ${error.message}`, { status: 500, headers: corsHeaders })
    exportPayload.users = data || []
  }

  if (scopes.includes('audits')) {
    const { data, error } = await admin.from('audits').select('*').eq('org_id', orgId)
    if (error) return new Response(`Failed to fetch audits: ${error.message}`, { status: 500, headers: corsHeaders })
    exportPayload.audits = data || []
  }

  const exportObject = {
    generatedAt: new Date().toISOString(),
    generatedBy: requestUserId,
    orgId,
    scope: scopes,
    data: exportPayload,
  }

  const fileContent = JSON.stringify(exportObject, null, 2)
  const blob = new Blob([fileContent], { type: 'application/json' })

  const bucketName = 'exports'
  await ensureBucket(admin, bucketName)

  const filePath = `org-exports/${orgId}/${Date.now()}-${crypto.randomUUID()}.json`

  const { error: uploadError } = await admin.storage.from(bucketName).upload(filePath, blob, {
    contentType: 'application/json',
  })
  if (uploadError) {
    return new Response(`Upload failed: ${uploadError.message}`, { status: 500, headers: corsHeaders })
  }

  await admin.rpc('log_data_access', {
    p_org_id: orgId,
    p_action: 'org_export',
    p_reason: reason ?? null,
    p_export_scope: { tables: scopes },
  })

  const { data: signedUrlData, error: signedErr } = await admin.storage.from(bucketName).createSignedUrl(filePath, 60 * 60)
  if (signedErr || !signedUrlData?.signedUrl) {
    return new Response('Failed to create signed URL', { status: 500, headers: corsHeaders })
  }

  return new Response(JSON.stringify({ downloadUrl: signedUrlData.signedUrl, path: filePath }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

async function ensureBucket(client: ReturnType<typeof createClient>, name: string) {
  const { data, error } = await client.storage.listBuckets()
  if (!error && data?.some((bucket) => bucket.name === name)) {
    return
  }
  await client.storage.createBucket(name, { public: false })
}
