// Creates a dedicated, self-contained test org with its own admin, branch
// manager, and auditor, plus zones/branches/survey/audits across every
// status - for manual visual QA in a browser. Purely additive: never
// touches any other org's data. Safe to re-run (idempotent by org name).
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY // service role required: uses auth.admin APIs, no anon fallback
if (!url || !key) throw new Error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) / SUPABASE_SERVICE_KEY')
const supa = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

const ORG_NAME = 'Trakr QA Sandbox'
const PASSWORD = 'QaTest@12345'
const USERS = [
  { email: 'qa.admin@trakr-test.dev', role: 'ADMIN', fullName: 'QA Admin' },
  { email: 'qa.manager@trakr-test.dev', role: 'BRANCH_MANAGER', fullName: 'QA Branch Manager' },
  { email: 'qa.auditor@trakr-test.dev', role: 'AUDITOR', fullName: 'QA Auditor' },
]

async function ensureAuthUser(email, password) {
  const { data: list } = await supa.auth.admin.listUsers({ perPage: 1000 })
  const existing = list.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
  if (existing) return existing.id
  const { data, error } = await supa.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw error
  return data.user.id
}

async function main() {
  console.log(`Creating org "${ORG_NAME}"...`)
  let { data: org } = await supa.from('organizations').select('id').eq('name', ORG_NAME).maybeSingle()
  if (!org) {
    const now = new Date().toISOString()
    const { data, error } = await supa.from('organizations').insert({ name: ORG_NAME, created_at: now, updated_at: now }).select('id').single()
    if (error) throw error
    org = data
  }
  const orgId = org.id
  console.log(`  org_id = ${orgId}`)

  console.log('Creating auth users + public.users rows...')
  const userIds = {}
  for (const u of USERS) {
    const authId = await ensureAuthUser(u.email, PASSWORD)
    const { data: existing } = await supa.from('users').select('id').eq('email', u.email).maybeSingle()
    if (existing) {
      await supa.from('users').update({ org_id: orgId, role: u.role, auth_user_id: authId, full_name: u.fullName, is_active: true }).eq('id', existing.id)
      userIds[u.role] = existing.id
    } else {
      const { data, error } = await supa.from('users').insert({
        org_id: orgId, email: u.email, role: u.role, auth_user_id: authId, full_name: u.fullName, is_active: true, email_verified: true,
      }).select('id').single()
      if (error) throw error
      userIds[u.role] = data.id
    }
  }
  console.log('  users:', userIds)

  console.log('Creating zone + branches (inactive until auditor coverage assigned)...')
  const now = new Date().toISOString()
  let { data: zone } = await supa.from('zones').select('id').eq('org_id', orgId).eq('name', 'QA Zone').maybeSingle()
  if (!zone) {
    const { data, error } = await supa.from('zones').insert({ org_id: orgId, name: 'QA Zone', description: 'QA sandbox zone', created_at: now, updated_at: now }).select('id').single()
    if (error) throw error
    zone = data
  }
  let { data: branches } = await supa.from('branches').select('id, name').eq('org_id', orgId)
  if (!branches?.length) {
    const { data, error } = await supa.from('branches').insert([
      { org_id: orgId, name: 'QA Branch North', address: '1 Test St', is_active: false, manager_id: userIds.BRANCH_MANAGER, created_at: now, updated_at: now },
      { org_id: orgId, name: 'QA Branch South', address: '2 Test Ave', is_active: false, manager_id: userIds.BRANCH_MANAGER, created_at: now, updated_at: now },
    ]).select('id, name')
    if (error) throw error
    branches = data
    const { error: zbErr } = await supa.from('zone_branches').insert(branches.map(b => ({ zone_id: zone.id, branch_id: b.id })))
    if (zbErr) throw zbErr
  }
  console.log('  branches:', branches.map(b => b.name))

  console.log('Assigning branch manager + auditor, then activating branches...')
  const { error: bmaErr } = await supa.from('branch_manager_assignments').upsert(
    branches.map(b => ({ branch_id: b.id, manager_id: userIds.BRANCH_MANAGER })), { onConflict: 'branch_id,manager_id' }
  )
  if (bmaErr) throw bmaErr
  const { error: aaErr } = await supa.from('auditor_assignments').upsert({
    user_id: userIds.AUDITOR, org_id: orgId, branch_ids: branches.map(b => b.id), zone_ids: [zone.id], updated_at: now,
  }, { onConflict: 'user_id' })
  if (aaErr) throw aaErr
  // Auditor coverage must exist BEFORE a branch can be activated (DB trigger guard).
  const { error: activateErr } = await supa.from('branches').update({ is_active: true }).in('id', branches.map(b => b.id))
  if (activateErr) throw activateErr

  console.log('Creating survey with weighted questions...')
  let { data: survey } = await supa.from('surveys').select('id, version').eq('org_id', orgId).eq('title', 'QA Store Compliance Audit').maybeSingle()
  let section
  if (!survey) {
    const { data, error } = await supa.from('surveys').insert({
      org_id: orgId, title: 'QA Store Compliance Audit', description: 'QA sandbox survey', is_active: true, version: 1, frequency: 'UNLIMITED', created_at: now, updated_at: now,
    }).select('id, version').single()
    if (error) throw error
    survey = data
    const { data: sec, error: secErr } = await supa.from('survey_sections').insert({ survey_id: survey.id, title: 'Compliance Checklist', description: 'Auto', order_num: 0 }).select('id').single()
    if (secErr) throw secErr
    section = sec
  } else {
    const { data: sec, error: secErr } = await supa.from('survey_sections').select('id').eq('survey_id', survey.id).limit(1).single()
    if (secErr) throw secErr
    section = sec
  }
  let { data: questions } = await supa.from('survey_questions').select('id, yes_weight, no_weight').eq('survey_id', survey.id).order('order_num')
  if (!questions?.length) {
    const questionDefs = [
      { text: 'Fire exits clear and unlocked?', yes: 20, no: 0 },
      { text: 'First aid kit stocked and accessible?', yes: 15, no: 0 },
      { text: 'Cleanliness standards met?', yes: 20, no: 0 },
      { text: 'Staff wearing proper uniform?', yes: 15, no: 0 },
      { text: 'Cash handling procedures followed?', yes: 30, no: 0 },
    ]
    const { data, error: qErr } = await supa.from('survey_questions').insert(
      questionDefs.map((q, i) => ({
        survey_id: survey.id, section_id: section.id, question_text: q.text, question_type: 'yes_no',
        required: true, order_num: i, is_weighted: true, yes_weight: q.yes, no_weight: q.no,
      }))
    ).select('id, yes_weight, no_weight')
    if (qErr) throw qErr
    questions = data
  }

  const { count: existingAuditCount } = await supa.from('audits').select('id', { count: 'exact', head: true }).eq('org_id', orgId)
  if (existingAuditCount > 0) {
    console.log(`  ${existingAuditCount} audits already exist for this org, skipping audit creation.`)
    console.log('\n=== QA Sandbox Ready (already seeded) ===')
    console.log(`Org: ${ORG_NAME} (${orgId})`)
    console.log(`Password for all 3 accounts: ${PASSWORD}`)
    for (const u of USERS) console.log(`  ${u.role.padEnd(15)} ${u.email}`)
    return
  }

  console.log('Creating audits across every status...')
  const endOfDay = (d) => { const e = new Date(d); e.setHours(23, 59, 59, 999); return e }
  const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d }

  const allYes = Object.fromEntries(questions.map(q => [q.id, 'yes']))
  const mostlyYes = Object.fromEntries(questions.map((q, i) => [q.id, i === 0 ? 'no' : 'yes']))
  const mixed = Object.fromEntries(questions.map((q, i) => [q.id, i % 2 === 0 ? 'yes' : 'no']))

  function baseAudit(branchId, status, responses, createdDaysAgo) {
    const created = daysAgo(createdDaysAgo)
    return {
      org_id: orgId, branch_id: branchId, survey_id: survey.id, survey_version: survey.version,
      assigned_to: userIds.AUDITOR, status, responses, na_reasons: {}, section_comments: {},
      created_at: created.toISOString(), updated_at: created.toISOString(),
      period_start: created.toISOString(), period_end: endOfDay(created).toISOString(), due_at: endOfDay(created).toISOString(),
      is_archived: false,
    }
  }

  const audits = [
    { ...baseAudit(branches[0].id, 'APPROVED', allYes, 10), submitted_by: userIds.AUDITOR, submitted_at: daysAgo(9).toISOString(), approved_by: userIds.ADMIN, approved_at: daysAgo(8).toISOString(), approval_note: 'Excellent compliance.' },
    { ...baseAudit(branches[1].id, 'APPROVED', mostlyYes, 7), submitted_by: userIds.AUDITOR, submitted_at: daysAgo(6).toISOString(), approved_by: userIds.ADMIN, approved_at: daysAgo(5).toISOString(), approval_note: 'Good, minor note on fire exit.' },
    { ...baseAudit(branches[0].id, 'APPROVED', mixed, 20), submitted_by: userIds.AUDITOR, submitted_at: daysAgo(19).toISOString(), approved_by: userIds.ADMIN, approved_at: daysAgo(18).toISOString(), approval_note: 'Approved after review.' },
    { ...baseAudit(branches[1].id, 'REJECTED', mixed, 4), submitted_by: userIds.AUDITOR, submitted_at: daysAgo(3).toISOString(), rejected_by: userIds.ADMIN, rejected_at: daysAgo(2).toISOString(), rejection_note: 'Please recheck cash handling procedures.' },
    { ...baseAudit(branches[0].id, 'REJECTED', mostlyYes, 15), submitted_by: userIds.AUDITOR, submitted_at: daysAgo(14).toISOString(), rejected_by: userIds.ADMIN, rejected_at: daysAgo(13).toISOString(), rejection_note: 'Fire exit photo unclear, resubmit.' },
    { ...baseAudit(branches[1].id, 'SUBMITTED', allYes, 2), submitted_by: userIds.AUDITOR, submitted_at: daysAgo(1).toISOString() },
    { ...baseAudit(branches[0].id, 'SUBMITTED', mixed, 1), submitted_by: userIds.AUDITOR, submitted_at: new Date().toISOString() },
    { ...baseAudit(branches[1].id, 'COMPLETED', allYes, 0) },
    { ...baseAudit(branches[0].id, 'IN_PROGRESS', { [questions[0].id]: 'yes' }, 0) },
    { ...baseAudit(branches[1].id, 'DRAFT', {}, 12) },
  ]

  const { data: created, error: aErr } = await supa.from('audits').insert(audits).select('id, status')
  if (aErr) throw aErr
  console.log(`  created ${created.length} audits:`, created.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc }, {}))

  console.log('\n=== QA Sandbox Ready ===')
  console.log(`Org: ${ORG_NAME} (${orgId})`)
  console.log(`Password for all 3 accounts: ${PASSWORD}`)
  for (const u of USERS) console.log(`  ${u.role.padEnd(15)} ${u.email}`)
}

main().catch(err => { console.error(err); process.exit(1) })
