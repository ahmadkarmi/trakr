import React from 'react'
import { OrganizationProvider } from '@/contexts/OrganizationContext'
import { useAuthStore } from '@/stores/auth'
import { getSupabase, hasSupabaseEnv } from '@/utils/supabaseClient'
import { renderWithProviders, createTestClient } from './renderWithProviders'
import type { QueryClient } from '@tanstack/react-query'
import { AuditorAssignment, AuditFrequency, UserRole } from '@trakr/shared'
import { api } from '../../utils/api'

const TEST_SURVEY_TITLE = 'Automation Survey Template'
const TEST_BRANCH_NAME = 'Automation Test Branch'

let authInitialized = false
let cachedSurveyId: string | null = null
let cachedOrgId: string | null = null
let cachedBranchId: string | null = null

type SupabaseClient = ReturnType<typeof getSupabase>

export type SupabaseTestProfile = {
  authUserId: string
  userId: string
  orgId: string
  email: string | null
}

async function ensureOrgAuditorCoverage(orgId: string, branchId: string, fallbackUserId: string) {
  const users = await api.getUsers()
  const auditors = users.filter(u => u.orgId === orgId && u.role === UserRole.AUDITOR)

  if (auditors.length === 0) {
    await ensureAuditorCoverage(fallbackUserId, orgId, branchId)
    return
  }

  for (const auditor of auditors) {
    await ensureAuditorCoverage(auditor.id, orgId, branchId)
  }
}

function getTestCredentials() {
  const env = (import.meta as any).env ?? {}
  const globalEnv = (globalThis as any)?.process?.env ?? {}
  const email = env.VITE_TEST_EMAIL || globalEnv.VITE_TEST_EMAIL
  const password = env.VITE_TEST_PASSWORD || globalEnv.VITE_TEST_PASSWORD
  if (!email || !password) {
    throw new Error('Supabase test credentials missing. Set VITE_TEST_EMAIL and VITE_TEST_PASSWORD.')
  }
  return { email, password }
}

export async function ensureSupabaseTestSession() {
  if (!hasSupabaseEnv()) {
    throw new Error('Supabase environment variables are required for integration tests.')
  }

  const supabase = getSupabase()
  const { data: sessionRes, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) {
    throw sessionError
  }
  if (!sessionRes?.session?.user) {
    const { email, password } = getTestCredentials()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  if (!authInitialized) {
    await useAuthStore.getState().init()
    authInitialized = true
  }

  return supabase
}

async function fetchTestUserProfile(supabase: SupabaseClient): Promise<SupabaseTestProfile> {
  const { data: authRes, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  const authUser = authRes?.user
  if (!authUser?.id) {
    throw new Error('Authenticated Supabase user not available for fixtures.')
  }

  let userRowResult = await supabase
    .from('users')
    .select('id, org_id, auth_user_id, email')
    .eq('id', authUser.id)
    .maybeSingle()

  if (!userRowResult?.data || userRowResult.error) {
    userRowResult = await supabase
      .from('users')
      .select('id, org_id, auth_user_id, email')
      .eq('auth_user_id', authUser.id)
      .maybeSingle()
  }

  if (!userRowResult?.data || userRowResult.error) {
    const email = authUser.email?.toLowerCase()
    if (email) {
      userRowResult = await supabase
        .from('users')
        .select('id, org_id, auth_user_id, email')
        .eq('email', email)
        .maybeSingle()
    }
  }

  let userRow = userRowResult?.data

  if (!userRow?.org_id) {
    const { api } = await import('../../utils/api')
    const users = await api.getUsers()
    const match = users.find(u => {
      const email = (u.email || '').toLowerCase()
      const targetEmail = (authUser.email || '').toLowerCase()
      return u.id === authUser.id || (targetEmail && email === targetEmail)
    })

    if (match?.orgId) {
      userRow = {
        id: match.id,
        org_id: match.orgId,
        auth_user_id: authUser.id,
        email: match.email || authUser.email || null,
      } as any
    }
  }

  if (!userRow?.org_id) {
    throw new Error('Test user does not belong to an organization. Ensure database is seeded.')
  }

  return {
    authUserId: authUser.id,
    userId: userRow.id,
    orgId: userRow.org_id,
    email: (userRow.email as string | null) ?? authUser.email ?? null,
  }
}

export async function getSupabaseTestProfile(): Promise<SupabaseTestProfile & { supabase: SupabaseClient }> {
  const supabase = await ensureSupabaseTestSession()
  const profile = await fetchTestUserProfile(supabase)
  return { supabase, ...profile }
}

async function ensureTestBranch(orgId: string, supabase: SupabaseClient, defaultUserId: string) {
  if (cachedBranchId && cachedOrgId === orgId) {
    await ensureAuditorCoverageForBranch(supabase, orgId, defaultUserId, cachedBranchId)
    return cachedBranchId
  }

  const { data: existing, error: fetchError } = await supabase
    .from('branches')
    .select('id, is_active')
    .eq('org_id', orgId)
    .eq('name', TEST_BRANCH_NAME)
    .maybeSingle()

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError
  }

  if (existing?.id) {
    cachedBranchId = existing.id
    cachedOrgId = orgId
    await ensureAuditorCoverageForBranch(supabase, orgId, defaultUserId, existing.id)
    await ensureOrgAuditorCoverage(orgId, existing.id, defaultUserId)
    if (!(existing as { is_active?: boolean }).is_active) {
      await api.updateBranch(existing.id, { isActive: true })
    }
    return existing.id
  }

  const timestamp = new Date().toISOString()
  const { data: created, error: insertError } = await supabase
    .from('branches')
    .insert({
      org_id: orgId,
      name: TEST_BRANCH_NAME,
      is_active: false,
      created_at: timestamp,
      updated_at: timestamp,
    })
    .select('id')
    .single()

  if (insertError) throw insertError

  cachedBranchId = created.id
  cachedOrgId = orgId
  await ensureAuditorCoverageForBranch(supabase, orgId, defaultUserId, created.id)
  await ensureOrgAuditorCoverage(orgId, created.id, defaultUserId)
  await api.updateBranch(created.id, { isActive: true })
  return created.id
}

async function ensureSurvey(orgId: string, userId: string, branchId: string, supabase: ReturnType<typeof getSupabase>) {
  if (cachedSurveyId && cachedOrgId === orgId) {
    return cachedSurveyId
  }

  const { data: existing, error: fetchError } = await supabase
    .from('surveys')
    .select('id, applicable_branch_ids')
    .eq('org_id', orgId)
    .eq('title', TEST_SURVEY_TITLE)
    .maybeSingle()

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError
  }

  const sections = [
    {
      title: 'Page 1',
      description: '',
      order: 0,
      questions: [],
    },
  ]

  if (existing?.id) {
    const branchIds = Array.isArray((existing as any).applicable_branch_ids)
      ? ((existing as any).applicable_branch_ids as (string | null | undefined)[]).filter((id): id is string => typeof id === 'string')
      : []
    if (!branchIds.includes(branchId)) {
      await api.updateSurvey(existing.id, { applicableBranchIds: [...branchIds, branchId] }, orgId)
    }
    // Self-heal: a survey reused by title may have lost its sections across
    // prior partial runs (the editor tests assert a "Page 1" section tab
    // exists). Restore it rather than trusting the reused row's shape.
    const { count: sectionCount } = await supabase
      .from('survey_sections')
      .select('id', { count: 'exact', head: true })
      .eq('survey_id', existing.id)
    if (!sectionCount) {
      await api.updateSurvey(existing.id, { sections }, orgId)
    }
    cachedSurveyId = existing.id
    cachedOrgId = orgId
    return existing.id
  }

  const created = await api.createSurvey({
    title: TEST_SURVEY_TITLE,
    description: 'Automation test template',
    sections,
    createdBy: userId,
    orgId,
    applicableBranchIds: [branchId],
  })

  cachedSurveyId = created.id
  cachedOrgId = orgId
  return created.id
}

async function ensureAuditorCoverageForBranch(_supabase: SupabaseClient, orgId: string, userId: string, branchId: string) {
  const assignments = await api.getAuditorAssignments(orgId)
  const existing = assignments.find(a => a.userId === userId)

  const branchIds = Array.isArray(existing?.branchIds)
    ? (existing!.branchIds as (string | null | undefined)[]).filter((id): id is string => typeof id === 'string')
    : []

  if (branchIds.includes(branchId)) {
    return
  }

  const zoneIds = Array.isArray(existing?.zoneIds)
    ? (existing!.zoneIds as (string | null | undefined)[]).filter((id): id is string => typeof id === 'string')
    : []

  const updatedBranches = [...branchIds, branchId]
  await api.assignAuditor(userId, updatedBranches, zoneIds)
}

export type SurveyFixture = {
  surveyId: string
  orgId: string
  branchId: string
  branchName: string
}

export async function ensureSurveyTemplateFixture(): Promise<SurveyFixture> {
  const { supabase, orgId, userId } = await getSupabaseTestProfile()

  const branchId = await ensureTestBranch(orgId, supabase, userId)
  const surveyId = await ensureSurvey(orgId, userId, branchId, supabase)

  await ensureAuditorCoverageForBranch(supabase, orgId, userId, branchId)
  await ensureOrgAuditorCoverage(orgId, branchId, userId)

  return { surveyId, orgId, branchId, branchName: TEST_BRANCH_NAME }
}

export async function ensureAuditorCoverage(userId: string, orgId: string, branchId: string) {
  const { supabase } = await getSupabaseTestProfile()
  await ensureAuditorCoverageForBranch(supabase, orgId, userId, branchId)
}

export async function renderWithSupabaseContext(
  ui: React.ReactElement,
  options?: { route?: string; queryClient?: QueryClient }
) {
  await ensureSupabaseTestSession()
  return renderWithProviders(React.createElement(OrganizationProvider, null, ui), options ?? {})
}
