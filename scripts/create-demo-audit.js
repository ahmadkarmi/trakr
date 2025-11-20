#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const { ensureEnvSet, formatMissing } = require('./utils/env')

const ARG_MAP = parseArgs(process.argv.slice(2))

async function main() {
  const { resolved, missing } = ensureEnvSet('scripts')
  if (missing.length) {
    console.error('❌ Missing required environment variables:')
    console.error(formatMissing(missing))
    process.exit(1)
  }

  const supabase = createClient(resolved.SUPABASE_URL, resolved.SUPABASE_SERVICE_KEY)

  try {
    const org = await resolveOrg(supabase, ARG_MAP.org)
    const branch = await resolveBranch(supabase, org.id, ARG_MAP.branch)
    const survey = await resolveSurvey(supabase, org.id, branch.id, ARG_MAP.survey)
    const auditor = await resolveAuditor(supabase, org.id, branch.id, ARG_MAP.auditor)

    console.log('🏢 Org:', org.name, `(${org.id})`)
    console.log('🏪 Branch:', branch.name, `(${branch.id})`)
    console.log('📝 Survey:', survey.title, `(${survey.id})`)
    console.log('👤 Auditor:', auditor.name, `(${auditor.id})`)

    const audit = await createAudit(supabase, { orgId: org.id, branchId: branch.id, surveyId: survey.id, assignedTo: auditor.id })
    console.log('✅ Audit created:', audit.id)

    await populateDemoResponses(supabase, audit.id, survey.id, auditor, branch)
    console.log('✨ Audit responses populated and marked as APPROVED for demo purposes')

    const baseAppUrl = (ARG_MAP.appUrl || process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '')
    const summaryUrl = `${baseAppUrl}/audit/${audit.id}/summary`
    console.log('\n🔗 Open the summary:')
    console.log(summaryUrl)
  } catch (error) {
    console.error('❌ Failed to create demo audit:')
    console.error(error.message || error)
    process.exit(1)
  }
}

async function resolveOrg(supabase, orgId) {
  if (orgId) {
    const { data, error } = await supabase.from('organizations').select('id, name').eq('id', orgId).maybeSingle()
    if (error) throw error
    if (!data) throw new Error(`Organization not found: ${orgId}`)
    return data
  }
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name')
    .order('created_at', { ascending: true })
    .limit(1)
  if (error) throw error
  if (!data || !data.length) {
    throw new Error('No organizations found. Seed your database first or provide --org=<id>.')
  }
  return data[0]
}

async function resolveBranch(supabase, orgId, branchId) {
  if (branchId) {
    const { data, error } = await supabase.from('branches').select('id, name, org_id, manager_id').eq('id', branchId).maybeSingle()
    if (error) throw error
    if (!data) throw new Error(`Branch not found: ${branchId}`)
    if (data.org_id !== orgId) throw new Error(`Branch ${branchId} does not belong to org ${orgId}`)
    return data
  }
  const { data, error } = await supabase
    .from('branches')
    .select('id, name, org_id, manager_id')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false })
    .limit(1)
  if (error) throw error
  if (!data || !data.length) {
    throw new Error(`No branches found for org ${orgId}. Create one or pass --branch=<id>`) 
  }
  return data[0]
}

async function resolveSurvey(supabase, orgId, branchId, surveyId) {
  const columns = 'id, title, org_id, is_active, applicable_branch_ids'
  if (surveyId) {
    const { data, error } = await supabase.from('surveys').select(columns).eq('id', surveyId).maybeSingle()
    if (error) throw error
    if (!data) throw new Error(`Survey not found: ${surveyId}`)
    if (data.org_id !== orgId) throw new Error(`Survey ${surveyId} does not belong to org ${orgId}`)
    return data
  }
  const { data, error } = await supabase
    .from('surveys')
    .select(columns)
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false })
    .limit(25)
  if (error) throw error
  if (!data || !data.length) {
    throw new Error(`No surveys found for org ${orgId}. Create one or pass --survey=<id>`) 
  }
  const applicable = data.find((s) => branchMatches(s, branchId))
  return applicable || data[0]
}

async function resolveAuditor(supabase, orgId, branchId, userId) {
  const columns = 'id, name, role, org_id, branch_id'
  if (userId) {
    const { data, error } = await supabase.from('users').select(columns).eq('id', userId).maybeSingle()
    if (error) throw error
    if (!data) throw new Error(`User not found: ${userId}`)
    if (data.role !== 'AUDITOR') throw new Error('Provided user is not an auditor')
    return data
  }
  const { data, error } = await supabase
    .from('users')
    .select(columns)
    .eq('org_id', orgId)
    .eq('role', 'AUDITOR')
    .order('updated_at', { ascending: false })
    .limit(50)
  if (error) throw error
  if (!data || !data.length) {
    throw new Error(`No auditors found for org ${orgId}. Create one or pass --auditor=<id>`) 
  }
  const branchAuditor = data.find((u) => u.branch_id === branchId)
  return branchAuditor || data[0]
}

async function createAudit(supabase, payload) {
  const { data, error } = await supabase.rpc('create_audit_with_cycle_guard', {
    p_org_id: payload.orgId,
    p_branch_id: payload.branchId,
    p_survey_id: payload.surveyId,
    p_assigned_to: payload.assignedTo,
  })
  if (error) throw error
  if (!data) throw new Error('RPC create_audit_with_cycle_guard returned no data')
  return data
}

async function populateDemoResponses(supabase, auditId, surveyId, auditor, branch) {
  const { data: questions, error } = await supabase
    .from('survey_questions')
    .select('id, question_type')
    .eq('survey_id', surveyId)
    .order('order_num', { ascending: true })
    .limit(500)
  if (error) throw error
  const responses = {}
  questions.forEach((q, idx) => {
    const type = String(q.question_type || 'yes_no').toLowerCase()
    if (type === 'yes_no') {
      responses[q.id] = idx % 3 === 0 ? 'no' : 'yes'
    } else if (type === 'date') {
      responses[q.id] = new Date().toISOString().split('T')[0]
    } else if (type === 'number') {
      responses[q.id] = String(90 + (idx % 10))
    } else {
      responses[q.id] = 'Demo response'
    }
  })

  const nowIso = new Date().toISOString()
  const approvalName = await resolveApprovalName(supabase, branch.manager_id) || 'Demo Manager'
  const approvalUserId = branch.manager_id || auditor.id

  const { error: updateError } = await supabase
    .from('audits')
    .update({
      responses,
      na_reasons: {},
      section_comments: {},
      status: 'APPROVED',
      submitted_at: nowIso,
      submitted_by: auditor.id,
      approved_at: nowIso,
      approved_by: approvalUserId,
      approval_note: 'Auto-approved demo audit',
      approval_signature_type: 'typed',
      approval_name: approvalName,
    })
    .eq('id', auditId)
  if (updateError) throw updateError
}

async function resolveApprovalName(supabase, managerId) {
  if (!managerId) return null
  const { data, error } = await supabase.from('users').select('id, name').eq('id', managerId).maybeSingle()
  if (error) throw error
  return data?.name || null
}

function branchMatches(survey, branchId) {
  const raw = survey.applicable_branch_ids
  if (!raw || !Array.isArray(raw) || raw.length === 0) return true
  return raw.includes(branchId)
}

function parseArgs(args) {
  const parsed = {}
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (!arg.startsWith('--')) continue
    const [keyPart, inlineVal] = arg.split('=')
    const key = keyPart.replace(/^--/, '')
    if (!key) continue
    if (inlineVal !== undefined) {
      parsed[key] = inlineVal
    } else if (args[i + 1] && !args[i + 1].startsWith('--')) {
      parsed[key] = args[i + 1]
      i += 1
    } else {
      parsed[key] = true
    }
  }
  return parsed
}

main()
