import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = (process.env.E2E_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
  const service = (process.env.E2E_SUPABASE_SERVICE_KEY || '').trim()
  if (!url || !service) throw new Error('Missing E2E_SUPABASE_URL or E2E_SUPABASE_SERVICE_KEY')
  return createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
}

// A real, non-admin, password-authenticated session — for exercising
// RLS/RPC auth.uid()-based checks the way an actual logged-in user would,
// as opposed to getAdminClient()'s service-role client which bypasses RLS
// entirely. The service key still works as the client's apikey header;
// auth.uid() is populated from the signed-in user's JWT regardless.
export async function getUserClient(email: string, password: string) {
  const url = (process.env.E2E_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
  const key = (process.env.E2E_SUPABASE_SERVICE_KEY || '').trim()
  if (!url || !key) throw new Error('Missing E2E_SUPABASE_URL or E2E_SUPABASE_SERVICE_KEY')
  const supa = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await supa.auth.signInWithPassword({ email, password })
  if (error) throw error
  return supa
}

// A genuinely unauthenticated client, keyed with the ANON key (not the
// service key). getUserClient/getAdminClient both hold the service key as
// their apikey, so signing out of those reverts to service-role and bypasses
// RLS - useless for asserting what an anonymous caller can/can't do. Returns
// null when the anon key isn't provided so a spec can skip rather than
// misfire. (The service key is never a valid anon stand-in here.)
export function getAnonClient() {
  const url = (process.env.E2E_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim()
  const anon = (process.env.E2E_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim()
  if (!url || !anon) return null
  return createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
}

// Names the seeder preserves (see scripts/seed-with-credentials.js). Because
// they're never re-inserted, they're OLDER than the freshly-seeded standard
// orgs - so "oldest org" must skip them, or specs that expect the standard
// seeded org (and whose seeded users live there) operate on the wrong,
// cross-org sandbox and fail (e.g. auditor coverage rejected).
const PRESERVED_ORG_NAMES = ['Trakr QA Sandbox']

export async function getFirstOrganization(): Promise<{ id: string; name: string } | null> {
  const supa = getAdminClient()
  const { data, error } = await supa
    .from('organizations')
    .select('id, name')
    .not('name', 'in', `(${PRESERVED_ORG_NAMES.map((n) => `"${n}"`).join(',')})`)
    .order('created_at', { ascending: true })
    .limit(1)
  if (error) throw error
  if (!data || !data.length) return null
  return { id: (data[0] as any).id, name: (data[0] as any).name }
}

export async function ensureZoneForOrg(orgId: string, nameHint = 'E2E Zone'): Promise<{ id: string; name: string }> {
  const supa = getAdminClient()
  // Try to find existing test zone
  const { data: exists, error: e1 } = await supa.from('zones').select('*').eq('org_id', orgId).ilike('name', `${nameHint}%`).order('created_at', { ascending: false }).limit(1)
  if (e1) throw e1
  if (exists && exists.length) return { id: (exists[0] as any).id, name: (exists[0] as any).name }
  // Create a new zone
  const now = new Date().toISOString()
  const name = `${nameHint} ${Date.now()}`
  const { data, error } = await supa.from('zones').insert({ org_id: orgId, name, description: 'Test Description', created_at: now, updated_at: now } as any).select('*').single()
  if (error) throw error
  return { id: (data as any).id, name }
}

export async function getUserByEmail(email: string) {
  const supa = getAdminClient()
  const { data, error } = await supa.from('users').select('*').eq('email', email).maybeSingle()
  if (error) throw error
  return data as any
}

export async function ensureBranchForOrg(orgId: string, nameHint = 'E2E Branch'): Promise<{ id: string; name: string }> {
  const supa = getAdminClient()
  // Try to find existing test branch
  const { data: exists, error: e1 } = await supa.from('branches').select('*').eq('org_id', orgId).ilike('name', `${nameHint}%`).order('created_at', { ascending: false }).limit(1)
  if (e1) throw e1
  if (exists && exists.length) return { id: (exists[0] as any).id, name: (exists[0] as any).name }
  // Create a new branch
  const now = new Date().toISOString()
  const name = `${nameHint} ${Date.now()}`
  const { data, error } = await supa.from('branches').insert({ org_id: orgId, name, address: 'Test Addr', created_at: now, updated_at: now } as any).select('*').single()
  if (error) throw error
  return { id: (data as any).id, name }
}

export async function ensureSimpleSurvey(orgId: string, titleHint = 'E2E Survey'): Promise<{ id: string; title: string }> {
  const supa = getAdminClient()
  // Reuse an existing matching survey if present
  const { data: surveys, error: sErr } = await supa.from('surveys').select('*').eq('org_id', orgId).ilike('title', `${titleHint}%`).order('updated_at', { ascending: false }).limit(1)
  if (sErr) throw sErr
  if (surveys && surveys.length) return { id: (surveys[0] as any).id, title: (surveys[0] as any).title }
  const now = new Date().toISOString()
  const title = `${titleHint} ${Date.now()}`
  const { data: s, error } = await supa.from('surveys').insert({ org_id: orgId, title, description: 'E2E', is_active: true, version: 1, frequency: 'UNLIMITED', created_at: now, updated_at: now } as any).select('*').single()
  if (error) throw error
  const surveyId = (s as any).id
  // Add one section
  const { data: sec, error: secErr } = await supa.from('survey_sections').insert({ survey_id: surveyId, title: 'E2E Page 1', description: 'Auto', order_num: 0 } as any).select('*').single()
  if (secErr) throw secErr
  // Add one required yes/no question
  const { error: qErr } = await supa.from('survey_questions').insert({ survey_id: surveyId, section_id: (sec as any).id, question_text: 'Fire exit clear?', question_type: 'yes_no', required: true, order_num: 0, is_weighted: false, yes_weight: null, no_weight: null } as any)
  if (qErr) throw qErr
  return { id: surveyId, title }
}

export async function ensureBranchManagerAssigned(managerUserId: string, branchId: string) {
  const supa = getAdminClient()
  const { data: exists, error: e1 } = await supa
    .from('branch_manager_assignments')
    .select('id')
    .eq('branch_id', branchId)
    .eq('manager_id', managerUserId)
    .maybeSingle()
  if (e1) throw e1
  if (exists) return
  const { error } = await supa
    .from('branch_manager_assignments')
    .insert({ branch_id: branchId, manager_id: managerUserId } as any)
  if (error) throw error
}

export async function setAuditSubmitted(auditId: string, submittedBy: string) {
  const supa = getAdminClient()
  const { error } = await supa
    .from('audits')
    .update({
      status: 'SUBMITTED',
      submitted_by: submittedBy,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', auditId)
  if (error) throw error
}

export async function setAuditApproved(auditId: string, approvedBy: string) {
  const supa = getAdminClient()
  const { error } = await supa
    .from('audits')
    .update({
      status: 'APPROVED',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', auditId)
  if (error) throw error
}

export async function setAuditRejected(auditId: string, rejectedBy: string, note = 'E2E rejection note') {
  const supa = getAdminClient()
  const { error } = await supa
    .from('audits')
    .update({
      status: 'REJECTED',
      rejected_by: rejectedBy,
      rejected_at: new Date().toISOString(),
      rejection_note: note,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', auditId)
  if (error) throw error
}

export async function getFirstQuestionId(surveyId: string): Promise<string> {
  const supa = getAdminClient()
  const { data, error } = await supa
    .from('survey_questions')
    .select('id')
    .eq('survey_id', surveyId)
    .order('order_num', { ascending: true })
    .limit(1)
    .single()
  if (error) throw error
  return (data as any).id
}

// Always creates a fresh branch (unlike ensureBranchForOrg's reuse-by-prefix
// behavior) so bulk-activation tests get a predictable, isolated eligible set
// instead of possibly picking up an already-active branch from a prior run.
export async function createInactiveBranch(orgId: string, nameHint = 'E2E Bulk Branch'): Promise<{ id: string; name: string }> {
  const supa = getAdminClient()
  const now = new Date().toISOString()
  const name = `${nameHint} ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const { data, error } = await supa.from('branches').insert({ org_id: orgId, name, address: 'Test Addr', is_active: false, created_at: now, updated_at: now } as any).select('*').single()
  if (error) throw error
  return { id: (data as any).id, name }
}

export async function linkBranchToZone(zoneId: string, branchId: string) {
  const supa = getAdminClient()
  const { error } = await supa.from('zone_branches').upsert({ zone_id: zoneId, branch_id: branchId } as any)
  if (error) throw error
}

export async function getBranchActive(branchId: string): Promise<boolean | null> {
  const supa = getAdminClient()
  const { data, error } = await supa.from('branches').select('is_active').eq('id', branchId).maybeSingle()
  if (error) throw error
  return (data as any)?.is_active ?? null
}

export async function deleteBranches(branchIds: string[]) {
  if (!branchIds.length) return
  const supa = getAdminClient()
  await supa.from('zone_branches').delete().in('branch_id', branchIds)
  const { error } = await supa.from('branches').delete().in('id', branchIds)
  if (error) throw error
}

export async function getAuditorAssignmentBranchIds(auditorId: string): Promise<string[]> {
  const supa = getAdminClient()
  const { data, error } = await supa.from('auditor_assignments').select('branch_ids').eq('user_id', auditorId).maybeSingle()
  if (error) throw error
  return (data as any)?.branch_ids || []
}

export async function deleteAudits(auditIds: string[]) {
  if (!auditIds.length) return
  const supa = getAdminClient()
  // Approve/reject flows fan out notifications keyed by related_id; remove
  // them too so downstream spec files see an unpolluted notification list
  const { error: nErr } = await supa.from('notifications').delete().in('related_id', auditIds)
  if (nErr) throw nErr
  const { error } = await supa.from('audits').delete().in('id', auditIds)
  if (error) throw error
}

export async function getAuditStatus(auditId: string): Promise<string | null> {
  const supa = getAdminClient()
  const { data, error } = await supa.from('audits').select('status').eq('id', auditId).maybeSingle()
  if (error) throw error
  return (data as any)?.status ?? null
}

// Notifications for a recipient, optionally scoped to one audit. Admin client
// (service role) so the read isn't itself gated by the notifications SELECT
// policy — the point is to assert the row EXISTS, independent of who can see it.
export async function getNotificationsFor(
  userId: string,
  relatedId?: string,
): Promise<Array<{ id: string; type: string; user_id: string; related_id: string | null }>> {
  const supa = getAdminClient()
  let query = supa.from('notifications').select('id, type, user_id, related_id').eq('user_id', userId)
  if (relatedId) query = query.eq('related_id', relatedId)
  const { data, error } = await query
  if (error) throw error
  return (data as any) ?? []
}

// Authenticated cross-user notification insert, exactly as the app does it
// (no RETURNING). Returns the PostgREST error (or null) so a spec can assert
// the send is permitted by the INSERT policy without a service-role bypass.
const PROBE_TITLE = 'E2E delivery probe'
export async function insertNotificationAs(
  senderEmail: string,
  senderPassword: string,
  recipientUserId: string,
): Promise<{ code: string; message: string } | null> {
  const supa = await getUserClient(senderEmail, senderPassword)
  const { error } = await supa.from('notifications').insert({
    user_id: recipientUserId,
    type: 'audit_submitted',
    title: PROBE_TITLE,
    message: 'cross-user insert regression guard',
    requires_action: false,
    is_read: false,
    created_at: new Date().toISOString(),
  })
  return error ? { code: (error as any).code, message: error.message } : null
}

// Remove the title-tagged probe rows insertNotificationAs leaves behind
// (they carry no related_id, so deleteAudits can't reach them).
export async function deleteNotificationProbes() {
  const supa = getAdminClient()
  const { error } = await supa.from('notifications').delete().eq('title', PROBE_TITLE)
  if (error) throw error
}

export async function ensureAuditorAssignedToBranch(auditorUserId: string, branchId: string) {
  const supa = getAdminClient()
  const { error } = await supa.rpc('set_auditor_assignment', { p_user_id: auditorUserId, p_branch_ids: [branchId], p_zone_ids: [] })
  if (error) throw error
}

// NOTE: set_auditor_assignment (above) writes to auditor_branch_assignments,
// a period-scoped table used by the assignment-board/scheduling flows. The
// ManageBranches "eligible to activate" and ZoneBulkAuditorAssignment UI
// instead read/write the separate auditor_assignments table directly (see
// supabaseApi.ts's setAuditorAssignment). Use this helper — not the RPC
// above — when a test needs to match what those specific screens see.
export async function setAuditorAssignmentDirect(auditorUserId: string, orgId: string, branchIds: string[], zoneIds: string[] = []) {
  const supa = getAdminClient()
  const { error } = await supa
    .from('auditor_assignments')
    .upsert({ user_id: auditorUserId, org_id: orgId, branch_ids: branchIds, zone_ids: zoneIds, updated_at: new Date().toISOString() } as any, { onConflict: 'user_id' })
  if (error) throw error
}

export async function ensureAuditFor(auditorUserId: string, orgId: string, branchId: string, surveyId: string, responses: Record<string, string> = {}): Promise<{ id: string }> {
  const supa = getAdminClient()
  // Fetch survey version
  const { data: s, error: sErr } = await supa.from('surveys').select('id, version, frequency').eq('id', surveyId).maybeSingle()
  if (sErr) throw sErr
  if (!s) throw new Error('Survey not found for ensureAuditFor')
  const now = new Date()
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  const { data, error } = await supa.from('audits').insert({
    org_id: orgId,
    branch_id: branchId,
    survey_id: surveyId,
    survey_version: (s as any).version ?? 1,
    assigned_to: auditorUserId,
    status: 'DRAFT',
    responses,
    na_reasons: {},
    section_comments: {},
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    period_start: now.toISOString(),
    period_end: endOfDay.toISOString(),
    due_at: endOfDay.toISOString(),
    is_archived: false,
  } as any).select('id').single()
  if (error) throw error
  return { id: (data as any).id }
}
