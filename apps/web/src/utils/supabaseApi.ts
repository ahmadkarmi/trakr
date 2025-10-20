import { Audit, AuditStatus, AuditorAssignment, Branch, Organization, User, UserRole, Zone, Survey, UserInvitation, OnboardingProgress } from '@trakr/shared'
import type { Tables, Enums } from '@trakr/shared'
import { getSupabase } from './supabaseClient'
import { logger } from './logger'

// Helpers
const toDate = (s?: string | null) => (s ? new Date(s) : undefined)

const mapUserRole = (role: Enums<'user_role'>): UserRole => {
  switch (role) {
    case 'SUPER_ADMIN': return UserRole.SUPER_ADMIN
    case 'ADMIN': return UserRole.ADMIN
    case 'BRANCH_MANAGER': return UserRole.BRANCH_MANAGER
    case 'AUDITOR': return UserRole.AUDITOR
    default: return UserRole.AUDITOR
  }
}
const mapAuditStatus = (status: Enums<'audit_status'>): AuditStatus => {
  switch (status) {
    case 'DRAFT': return AuditStatus.DRAFT
    case 'IN_PROGRESS': return AuditStatus.IN_PROGRESS
    case 'COMPLETED': return AuditStatus.COMPLETED
    case 'SUBMITTED': return AuditStatus.SUBMITTED
    case 'APPROVED': return AuditStatus.APPROVED
    case 'REJECTED': return AuditStatus.REJECTED
  }
}

const mapOrganization = (row: Tables<'organizations'>): Organization => ({
  id: row.id,
  name: row.name,
  timeZone: row.time_zone || 'UTC',
  weekStartsOn: (row.week_starts_on as 0 | 1) ?? 0,
  gatingPolicy: (row as any).gating_policy || 'completed_approved',
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
})

const displayNameFromEmail = (email: string) => {
  const local = email.split('@')[0] || email
  return local.replace(/\./g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
}

const mapUser = (row: Tables<'users'>): User => ({
  id: row.id,
  name: (row as any).full_name || displayNameFromEmail(row.email),
  email: row.email,
  role: mapUserRole(row.role as Enums<'user_role'>),
  orgId: row.org_id,
  branchId: row.branch_id || undefined,
  signatureUrl: (row as any).signature_url || undefined,
  avatarUrl: (row as any).avatar_url || undefined,
  emailVerified: (row as any).email_verified || false,
  isActive: (row as any).is_active !== false, // default to true if not specified
  lastSeenAt: (row as any).last_seen_at ? new Date((row as any).last_seen_at) : undefined,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
})

const mapBranch = (row: Tables<'branches'>): Branch => ({
  id: row.id,
  name: row.name,
  address: row.address || undefined,
  orgId: row.org_id,
  managerId: row.manager_id || undefined,
  isActive: (row as any).is_active ?? false,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
})

const mapZone = (row: Tables<'zones'>, branchIds: string[]): Zone => ({
  id: row.id,
  orgId: row.org_id,
  name: row.name,
  description: row.description || undefined,
  branchIds,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
})

// Ensure survey question types match the UI enum (QuestionType) used in screens
function mapQuestionTypeVal(qt?: string): any {
  const norm = (qt || 'yes_no').toString().trim().toLowerCase().replace(/[\s-]+/g, '_')
  switch (norm) {
    case 'yes_no':
    case 'text':
    case 'number':
    case 'date':
    case 'multiple_choice':
    case 'checkbox':
      return norm as any
    default:
      return 'yes_no' as any
  }
}

const mapAudit = (row: Tables<'audits'>): Audit => ({
  id: row.id,
  orgId: row.org_id,
  branchId: row.branch_id,
  surveyId: row.survey_id,
  surveyVersion: row.survey_version,
  assignedTo: row.assigned_to || '',
  status: mapAuditStatus(row.status as Enums<'audit_status'>),
  responses: (row.responses as any) || {},
  naReasons: (row.na_reasons as any) || {},
  sectionComments: (row.section_comments as any) || undefined,
  overrideScores: ((row as any).override_scores as any) || undefined,
  overrideNotes: ((row as any).override_notes as any) || undefined,
  submittedBy: row.submitted_by || undefined,
  submittedAt: toDate(row.submitted_at),
  approvedBy: row.approved_by || undefined,
  approvedAt: toDate(row.approved_at),
  approvalNote: row.approval_note || undefined,
  approvalSignatureUrl: row.approval_signature_url || undefined,
  approvalSignatureType: row.approval_signature_type as any,
  approvalName: row.approval_name || undefined,
  rejectedBy: row.rejected_by || undefined,
  rejectedAt: toDate(row.rejected_at),
  rejectionNote: row.rejection_note || undefined,
  createdBy: (row as any).created_by || undefined,
  createdOrigin: (row as any).created_origin || undefined,
  startedBy: (row as any).started_by || undefined,
  startedAt: toDate((row as any).started_at),
  completedBy: (row as any).completed_by || undefined,
  completedAt: toDate((row as any).completed_at),
  periodStart: toDate(row.period_start),
  periodEnd: toDate(row.period_end),
  dueAt: toDate(row.due_at),
  isArchived: !!row.is_archived,
  archivedAt: toDate(row.archived_at),
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
})

// Period helpers (align with mock scheduling logic)
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}
function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}
function startOfWeekGeneric(d: Date, weekStartsOn: 0 | 1 = 1): Date {
  const day = d.getDay()
  const diff = (day - weekStartsOn + 7) % 7
  const s = new Date(d)
  s.setDate(d.getDate() - diff)
  s.setHours(0, 0, 0, 0)
  return s
}
function endOfWeekGeneric(d: Date, weekStartsOn: 0 | 1 = 1): Date {
  const s = startOfWeekGeneric(d, weekStartsOn)
  const e = new Date(s)
  e.setDate(s.getDate() + 6)
  e.setHours(23, 59, 59, 999)
  return e
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}
function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3)
  return new Date(d.getFullYear(), q * 3, 1, 0, 0, 0, 0)
}
function endOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3)
  return new Date(d.getFullYear(), (q + 1) * 3, 0, 23, 59, 59, 999)
}
function getOrgLocalNow(org: Tables<'organizations'>, now: Date): Date {
  try {
    return new Date(now.toLocaleString('en-US', { timeZone: org.time_zone || 'UTC' }))
  } catch {
    return new Date(now)
  }
}
function adjustToUTCFromOrgLocal(orgLocal: Date, orgLocalNow: Date, now: Date): Date {
  const delta = orgLocalNow.getTime() - now.getTime()
  return new Date(orgLocal.getTime() - delta)
}
function getPeriodRangeForOrg(
  freq: Enums<'audit_frequency'> | null | undefined,
  now: Date,
  org: Tables<'organizations'>,
): { start: Date; end: Date } {
  const orgNow = getOrgLocalNow(org, now)
  let localStart: Date
  let localEnd: Date
  switch (freq) {
    case 'DAILY':
      localStart = startOfDay(orgNow)
      localEnd = endOfDay(orgNow)
      break
    case 'WEEKLY': {
      const w = ((org.week_starts_on as any) ?? 1) as 0 | 1
      localStart = startOfWeekGeneric(orgNow, w)
      localEnd = endOfWeekGeneric(orgNow, w)
      break
    }
    case 'MONTHLY':
      localStart = startOfMonth(orgNow)
      localEnd = endOfMonth(orgNow)
      break
    case 'QUARTERLY':
      localStart = startOfQuarter(orgNow)
      localEnd = endOfQuarter(orgNow)
      break
    default:
      // UNLIMITED or unspecified – make a trivial same-day window
      localStart = startOfDay(orgNow)
      localEnd = endOfDay(orgNow)
  }
  return { start: adjustToUTCFromOrgLocal(localStart, orgNow, now), end: adjustToUTCFromOrgLocal(localEnd, orgNow, now) }
}

// Upload a data URL to Supabase Storage and return its public URL
async function uploadProfileDataUrl(prefix: 'avatars' | 'signatures', userId: string, dataUrl: string): Promise<string> {
  const supabase = await getSupabase()
  // Parse mime from data URL: data:image/png;base64,....
  const mimeMatch = /^data:([^;]+);base64,/.exec(dataUrl)
  const mime = mimeMatch?.[1] || 'image/png'
  const ext = mime.includes('jpeg') ? 'jpg' : (mime.split('/')[1] || 'png')
  const path = `${prefix}/${userId}-${Date.now()}.${ext}`
  // Convert to blob via fetch for simplicity in browser env
  const resp = await fetch(dataUrl)
  const blob = await resp.blob()
  const { error: upErr } = await supabase.storage.from('profile-media').upload(path, blob, { contentType: mime, upsert: true })
  if (upErr) throw upErr
  const { data } = supabase.storage.from('profile-media').getPublicUrl(path)
  return data.publicUrl
}

export const supabaseApi = {
  // Reads
  async getOrganizations(): Promise<Organization[]> {
    const supabase = await getSupabase()
    const { data, error } = await supabase.from('organizations').select('*').order('created_at', { ascending: true })
    if (error) throw error
    return (data || []).map(mapOrganization)
  },

  async getUncoveredActiveBranchesIfAuditorRemoved(userId: string): Promise<{ ids: string[]; names: string[] }> {
    return await this._findUncoveredActiveBranchesIfAuditorRemoved(userId)
  },

  // Unassigned survey instances (RPC first, fallback to client derivation)
  async getUnassignedSurveyInstances(params: { orgId?: string; frequency?: 'all' | 'weekly' | 'monthly' | 'quarterly'; search?: string; limit?: number; offset?: number }): Promise<Array<{ surveyId: string; surveyTitle: string; frequency?: string; branchId: string; branchName: string }>> {
    const supabase = await getSupabase()
    const { orgId, frequency = 'all', search = '', limit = 50, offset = 0 } = params || {}
    try {
      const { data, error } = await supabase.rpc('get_unassigned_instances', {
        p_org_id: orgId || null,
        p_frequency: frequency,
        p_search: search || null,
        p_limit: limit,
        p_offset: offset,
      })
      if (error) throw error
      return (data || []).map((r: any) => ({
        surveyId: r.survey_id,
        surveyTitle: r.survey_title,
        frequency: r.frequency || null,
        branchId: r.branch_id,
        branchName: r.branch_name,
      }))
    } catch (_e) {
      // Fallback: compute on the client
      const [surveys, branches, assignments] = await Promise.all([
        this.getSurveys(orgId),
        this.getBranches(orgId),
        this.getAuditorAssignments(orgId),
      ])
      const branchHasAuditor = new Set<string>()
      assignments.forEach(a => (a.branchIds || []).forEach(bid => branchHasAuditor.add(bid)))
      const freqOk = (s: Survey) => {
        if (!frequency || frequency === 'all') return true
        const f = (s.frequency as any)?.toLowerCase?.() ?? 'weekly'
        return f === frequency
      }
      const results: Array<{ surveyId: string; surveyTitle: string; frequency?: string; branchId: string; branchName: string }> = []
      surveys.filter(s => s.isActive && freqOk(s)).forEach((s) => {
        const candidateIds = (s as any).applicableBranchIds && (s as any).applicableBranchIds.length > 0
          ? (s as any).applicableBranchIds as string[]
          : branches.map(b => b.id)
        candidateIds.forEach((bid) => {
          if (!branchHasAuditor.has(bid)) {
            const b = branches.find(bb => bb.id === bid)
            if (b) results.push({ surveyId: s.id, surveyTitle: s.title, frequency: (s as any).frequency as string, branchId: b.id, branchName: b.name })
          }
        })
      })
      const s = (search || '').trim().toLowerCase()
      const filtered = s ? results.filter(r => r.surveyTitle.toLowerCase().includes(s) || r.branchName.toLowerCase().includes(s)) : results
      return filtered.slice(offset, offset + limit)
    }
  },
  async createOrganization(name: string): Promise<Organization> {
    const supabase = await getSupabase()
    const { data, error } = await supabase.from('organizations').insert({
      name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).select('*').single()
    if (error) throw error
    return mapOrganization(data)
  },
  async getUsers(orgId?: string): Promise<User[]> {
    const supabase = await getSupabase()
    let q = supabase.from('users').select('*')
    
    // Filter by org unless Super Admin in global view (orgId = undefined)
    if (orgId) {
      q = q.eq('org_id', orgId)
    }
    
    const { data, error } = await q.order('created_at', { ascending: true })
    if (error) throw error
    return (data || []).map(mapUser)
  },

  async getUserById(id: string): Promise<User | null> {
    const supabase = await getSupabase()
    const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ? mapUser(data as Tables<'users'>) : null
  },
  async getBranches(orgId?: string): Promise<Branch[]> {
    const supabase = await getSupabase()
    let q = supabase.from('branches').select('*')
    if (orgId) q = q.eq('org_id', orgId)
    const { data, error } = await q.order('name', { ascending: true })
    if (error) throw error
    return (data || []).map(mapBranch)
  },
  async getZones(orgId?: string): Promise<Zone[]> {
    const supabase = await getSupabase()
    let q = supabase.from('zones').select('*')
    if (orgId) q = q.eq('org_id', orgId)
    const { data: zones, error } = await q.order('name', { ascending: true })
    if (error) throw error
    const zoneIds = (zones || []).map((z: Tables<'zones'>) => z.id)
    let branchLinks: Tables<'zone_branches'>[] = []
    if (zoneIds.length) {
      const { data: zb, error: e2 } = await supabase.from('zone_branches').select('*').in('zone_id', zoneIds)
      if (e2) throw e2
      branchLinks = zb || []
    }
    return (zones || []).map((z: Tables<'zones'>) => mapZone(z, branchLinks.filter((l) => l.zone_id === z.id).map((l) => l.branch_id)))
  },
  async getAudits(filters?: { assignedTo?: string; status?: AuditStatus; branchId?: string; orgId?: string; updatedAfter?: Date; updatedBefore?: Date }): Promise<Audit[]> {
    const supabase = await getSupabase()
    let q = supabase.from('audits').select('*')
    if (filters?.assignedTo) q = q.eq('assigned_to', filters.assignedTo)
    if (filters?.status) q = q.eq('status', String(filters.status).toUpperCase())
    if (filters?.branchId) q = q.eq('branch_id', filters.branchId)
    if (filters?.orgId) q = q.eq('org_id', filters.orgId)
    if (filters?.updatedAfter) q = q.gte('updated_at', filters.updatedAfter.toISOString())
    if (filters?.updatedBefore) q = q.lte('updated_at', filters.updatedBefore.toISOString())
    const { data, error } = await q
    if (error) throw error
    return (data || []).map(mapAudit)
  },
  async getAuditById(id: string): Promise<Audit | null> {
    const supabase = await getSupabase()
    const { data, error } = await supabase.from('audits').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    if (!data) return null
    const base = mapAudit(data as Tables<'audits'>)
    // Load section photos
    const { data: photos, error: pErr } = await supabase
      .from('audit_photos')
      .select('*')
      .eq('audit_id', id)
      .order('uploaded_at', { ascending: false })
    if (pErr) throw pErr
    const sectionPhotos = (photos || []).map((p: Tables<'audit_photos'>) => ({
      id: p.id,
      auditId: p.audit_id,
      sectionId: p.section_id || undefined,
      filename: p.filename,
      url: p.url,
      uploadedBy: p.uploaded_by,
      uploadedAt: new Date(p.uploaded_at),
    }))
    return { ...base, sectionPhotos }
  },
  async getAuditorAssignments(orgId?: string): Promise<AuditorAssignment[]> {
    const supabase = await getSupabase()
    let q = supabase
      .from('auditor_assignments')
      .select('*')
    
    // Filter by org if provided (for multi-tenant isolation)
    if (orgId) {
      q = q.eq('org_id', orgId)
    }
    
    const { data, error} = await q.order('updated_at', { ascending: false })
    
    if (error) throw error
    return (data || []).map((row: any) => ({
      userId: row.user_id,
      branchIds: row.branch_ids || [],
      zoneIds: row.zone_ids || [],
    }))
  },

  // Mutations (partial; extend as we migrate screens)
  async setAuditorAssignment(userId: string, payload: { branchIds: string[]; zoneIds: string[] }): Promise<void> {
    const supabase = await getSupabase()
    // Gating: prevent removing the last auditor from an active branch
    // Load existing assignment for this user to compute removals
    const { data: existingAssignment } = await supabase
      .from('auditor_assignments')
      .select('branch_ids')
      .eq('user_id', userId)
      .maybeSingle()

    const prevBranchIds: string[] = (existingAssignment?.branch_ids || [])
    const nextBranchIds: string[] = payload.branchIds || []
    const removed = prevBranchIds.filter((id: string) => !nextBranchIds.includes(id))
    if (removed.length) {
      // Among removed, find active branches
      const { data: activeBranches } = await supabase
        .from('branches')
        .select('id, is_active')
        .in('id', removed)
      const activeIds = (activeBranches || []).filter((b: any) => b.is_active).map((b: any) => b.id)
      if (activeIds.length) {
        // Disallow any auditor removal from active branches (policy)
        try {
          const { data: auth } = await supabase.auth.getUser()
          await this.createActivityLog(auth?.user?.id || '', 'AUDITOR_UNASSIGN_BLOCKED_ACTIVE_BRANCH', `Attempted to unassign auditor ${userId} from active branches: ${activeIds.join(', ')}`, 'user', userId)
        } catch {}
        throw new Error('Cannot remove auditors from an active branch. Deactivate the branch first.')
      }
    }

    // Check if assignment exists
    const { data: existing } = await supabase
      .from('auditor_assignments')
      .select('id')
      .eq('user_id', userId)
      .single()
    
    if (existing) {
      // Update existing assignment
      const { error } = await supabase
        .from('auditor_assignments')
        .update({
          branch_ids: payload.branchIds,
          zone_ids: payload.zoneIds,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
      
      if (error) throw error
    } else {
      // Create new assignment
      const { error } = await supabase
        .from('auditor_assignments')
        .insert({
          user_id: userId,
          branch_ids: payload.branchIds,
          zone_ids: payload.zoneIds,
        })
      
      if (error) throw error
    }
  },

  // Auditor assignment helper methods for UI components
  async getAuditorAssignment(auditorId: string): Promise<AuditorAssignment | null> {
    const supabase = await getSupabase()
    const { data, error } = await supabase
      .from('auditor_assignments')
      .select('*')
      .eq('user_id', auditorId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned, return null
        return null
      }
      throw error
    }
    
    if (!data) return null
    
    return {
      userId: data.user_id,
      branchIds: data.branch_ids || [],
      zoneIds: data.zone_ids || [],
    }
  },

  async getAuditorAssignmentsByBranch(branchId: string): Promise<AuditorAssignment[]> {
    const supabase = await getSupabase()
    const { data, error } = await supabase
      .from('auditor_assignments')
      .select('*')
      .contains('branch_ids', [branchId])
    
    if (error) throw error
    return (data || []).map((row: any) => ({
      userId: row.user_id,
      branchIds: row.branch_ids || [],
      zoneIds: row.zone_ids || [],
    }))
  },

  async assignAuditor(auditorId: string, branchIds: string[], zoneIds: string[]): Promise<AuditorAssignment> {
    await this.setAuditorAssignment(auditorId, { branchIds, zoneIds })
    return { userId: auditorId, branchIds, zoneIds }
  },

  async _findUncoveredActiveBranchesIfAuditorRemoved(userId: string): Promise<{ ids: string[]; names: string[] }> {
    const supabase = await getSupabase()
    const { data: assn } = await supabase
      .from('auditor_assignments')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (!assn) return { ids: [], names: [] }
    const direct: string[] = (assn as any).branch_ids || []
    const aZones: string[] = (assn as any).zone_ids || []
    let zoneBranches: { branch_id: string }[] = []
    if (aZones.length) {
      const { data: zb } = await supabase
        .from('zone_branches')
        .select('branch_id')
        .in('zone_id', aZones)
      zoneBranches = (zb || []) as any
    }
    const candidateBranchIds = Array.from(new Set([ ...direct, ...zoneBranches.map(z => z.branch_id) ]))
    if (!candidateBranchIds.length) return { ids: [], names: [] }
    const { data: activeBranches } = await supabase
      .from('branches')
      .select('id, name, is_active')
      .in('id', candidateBranchIds)
    const active = (activeBranches || []).filter((b: any) => b.is_active)
    if (!active.length) return { ids: [], names: [] }
    const activeIds = active.map((b: any) => b.id)
    const { data: others } = await supabase
      .from('auditor_assignments')
      .select('branch_ids, zone_ids, user_id')
      .neq('user_id', userId)
    const { data: zbAll } = await supabase
      .from('zone_branches')
      .select('branch_id, zone_id')
      .in('branch_id', activeIds)
    const zonesByBranch = new Map<string, string[]>()
    ;(zbAll || []).forEach((r: any) => {
      const arr = zonesByBranch.get(r.branch_id) || []
      arr.push(r.zone_id)
      zonesByBranch.set(r.branch_id, arr)
    })
    const isCoveredByOthers = (branchId: string) => {
      return (others || []).some((a: any) => {
        const hasDirect = Array.isArray(a.branch_ids) && a.branch_ids.includes(branchId)
        if (hasDirect) return true
        const zlist = zonesByBranch.get(branchId) || []
        return Array.isArray(a.zone_ids) && a.zone_ids.some((z: string) => zlist.includes(z))
      })
    }
    const uncovered = active.filter((b: any) => !isCoveredByOthers(b.id))
    return { ids: uncovered.map((b: any) => b.id), names: uncovered.map((b: any) => b.name) }
  },

  // Branch CRUD + settings
  async createBranch(payload: { orgId: string; name: string; address?: string; managerId?: string }): Promise<Branch> {
    const supabase = await getSupabase()
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('branches')
      .insert({ org_id: payload.orgId, name: payload.name, address: payload.address ?? null, manager_id: payload.managerId ?? null, created_at: now, updated_at: now } as any)
      .select('*')
      .single()
    if (error) throw error
    return mapBranch(data as Tables<'branches'>)
  },
  async updateBranch(id: string, updates: Partial<Pick<Branch, 'name' | 'address' | 'managerId' | 'isActive'>>): Promise<Branch> {
    const supabase = await getSupabase()
    // If attempting to activate the branch, enforce at least one auditor assigned (directly or via zone)
    if (updates.isActive === true) {
      // Check direct branch assignments
      const { data: direct } = await supabase
        .from('auditor_assignments')
        .select('branch_ids, zone_ids')
      const hasDirect = (direct || []).some((a: any) => Array.isArray(a.branch_ids) && a.branch_ids.includes(id))
      let hasZone = false
      if (!hasDirect) {
        // Load zones for this branch
        const { data: zb } = await supabase
          .from('zone_branches')
          .select('zone_id')
          .eq('branch_id', id)
        const zoneIds = (zb || []).map((z: any) => z.zone_id)
        if (zoneIds.length) {
          // Check any auditor assignment that includes any of these zones
          hasZone = (direct || []).some((a: any) => Array.isArray(a.zone_ids) && a.zone_ids.some((z: string) => zoneIds.includes(z)))
        }
      }
      if (!hasDirect && !hasZone) {
        try {
          const { data: auth } = await supabase.auth.getUser()
          await this.createActivityLog(auth?.user?.id || '', 'BRANCH_ACTIVATION_BLOCKED_NO_AUDITOR', 'Activation blocked: no assigned auditors (direct or via zone).', 'branch', id)
        } catch {}
        throw new Error('Cannot activate branch without at least one assigned auditor (directly or via zone).')
      }
    }
    const base: any = { updated_at: new Date().toISOString() }
    if (updates.name != null) base.name = updates.name
    if (updates.address != null) base.address = updates.address
    if (updates.managerId !== undefined) base.manager_id = updates.managerId
    if (updates.isActive != null) base.is_active = !!updates.isActive
    const { data, error } = await supabase.from('branches').update(base).eq('id', id).select('*').single()
    if (error) throw error
    return mapBranch(data as Tables<'branches'>)
  },
  async deleteBranch(id: string): Promise<void> {
    const supabase = await getSupabase()
    // Clean references best-effort
    await supabase.from('zone_branches').delete().eq('branch_id', id)
    await supabase.from('auditor_branch_assignments').delete().eq('branch_id', id)
    const { error } = await supabase.from('branches').delete().eq('id', id)
    if (error) throw error
  },
  async setBranchManager(branchId: string, managerId: string | null): Promise<Branch> {
    const supabase = await getSupabase()
    const { data, error } = await supabase
      .from('branches')
      .update({ manager_id: managerId, updated_at: new Date().toISOString() } as any)
      .eq('id', branchId)
      .select('*')
      .single()
    if (error) throw error
    return mapBranch(data as Tables<'branches'>)
  },

  async setAuditAssignedTo(auditId: string, userId: string) {
    const supabase = await getSupabase()
    // Defensive block at application layer to enforce policy even if DB RPC is permissive
    // Fetch current status and short-circuit if submitted/approved
    const { data: cur, error: curErr } = await supabase.from('audits').select('status').eq('id', auditId).maybeSingle()
    if (curErr) throw curErr
    if (cur?.status === 'SUBMITTED' || cur?.status === 'APPROVED') {
      return
    }
    const { error } = await supabase.rpc('set_audit_assigned_to', { p_audit_id: auditId, p_to_user: userId })
    if (error) throw error
  },

  async reassignOpenAuditsForBranch(branchId: string, toUserId: string): Promise<number> {
    const supabase = await getSupabase()
    const { data, error } = await supabase.rpc('reassign_open_audits_for_branch', { p_branch_id: branchId, p_to_user: toUserId })
    if (error) throw error
    return (data as number) || 0
  },

  async reassignOpenAuditsForBranches(branchIds: string[], toUserId: string): Promise<number> {
    // Batch by calling the single-branch RPC per ID; keeps parity with mock API shape
    let total = 0
    for (const bid of branchIds) {
      total += await this.reassignOpenAuditsForBranch(bid, toUserId)
    }
    return total
  },

  async reassignUnstartedAuditsForBranches(branchIds: string[], toUserId: string): Promise<number> {
    const supabase = await getSupabase()
    const { data, error } = await supabase.rpc('reassign_unstarted_audits_for_branches', { p_branch_ids: branchIds, p_to_user: toUserId })
    if (error) throw error
    return (data as number) || 0
  },

  async reassignUnstartedAuditsForBranch(branchId: string, toUserId: string): Promise<number> {
    // Use the branches RPC with a single-item array
    return this.reassignUnstartedAuditsForBranches([branchId], toUserId)
  },

  // Lifecycle
  async submitAuditForApproval(auditId: string, submittedBy: string): Promise<Audit> {
    const supabase = await getSupabase()
    const { data, error } = await supabase.rpc('submit_audit', { p_audit_id: auditId, p_submitted_by: submittedBy })
    if (error) throw error
    // data returns a full row
    return mapAudit(data as Tables<'audits'>)
  },

  async setOverrideScore(
    auditId: string,
    questionId: string,
    points: number,
    note: string,
    _userId: string,
  ): Promise<Audit> {
    const supabase = await getSupabase()
    const { data: current, error: cErr } = await supabase.from('audits').select('*').eq('id', auditId).single()
    if (cErr) throw cErr
    const cur = current as any
    const nextScores = { ...(cur.override_scores || {}), [questionId]: points }
    const nextNotes = { ...(cur.override_notes || {}), [questionId]: note }
    const { data, error } = await supabase
      .from('audits')
      .update({ override_scores: nextScores, override_notes: nextNotes, updated_at: new Date().toISOString() } as any)
      .eq('id', auditId)
      .select('*')
      .single()
    if (error) throw error
    return mapAudit(data as Tables<'audits'>)
  },
  async setAuditApproval(
    auditId: string,
    payload: { status: 'approved' | 'rejected'; note?: string; userId: string; signatureUrl?: string; signatureType?: 'image' | 'typed' | 'drawn'; approvalName?: string }
  ): Promise<Audit> {
    const supabase = await getSupabase()
    const { data, error } = await supabase.rpc('set_audit_approval', {
      p_audit_id: auditId,
      p_status: payload.status,
      p_user_id: payload.userId,
      p_note: payload.note ?? null,
      p_signature_url: payload.signatureUrl ?? null,
      p_signature_type: payload.signatureType ?? null,
      p_approval_name: payload.approvalName ?? null,
    })
    if (error) throw error
    return mapAudit(data as Tables<'audits'>)
  },
  async setAuditStatus(auditId: string, status: AuditStatus): Promise<Audit | null> {
    const supabase = await getSupabase()
    // Limit to allowed transitions used by UI (primarily -> COMPLETED)
    const allowedStatuses = ['DRAFT', 'IN_PROGRESS']
    const { data, error } = await supabase
      .from('audits')
      .update({ status: status.toUpperCase(), updated_at: new Date().toISOString() } as any)
      .eq('id', auditId)
      .in('status', allowedStatuses)
      .select('*')
      .maybeSingle()
    if (error) throw error
    return data ? mapAudit(data as Tables<'audits'>) : null
  },

  // Audit creation and progress
  async createAudit(payload: { orgId: string; branchId: string; surveyId: string; assignedTo: string }): Promise<Audit> {
    const supabase = await getSupabase()
    // Load survey (version, frequency, applicable branches) and org
    const [{ data: s, error: sErr }, { data: org, error: oErr }] = await Promise.all([
      supabase.from('surveys').select('id, version, frequency, org_id, applicable_branch_ids').eq('id', payload.surveyId).maybeSingle(),
      supabase.from('organizations').select('*').eq('id', payload.orgId).maybeSingle(),
    ])
    if (sErr) throw sErr
    if (oErr) throw oErr
    if (!s) throw new Error('Survey not found')
    if (!org) throw new Error('Organization not found')
    
    // BRANCH ASSIGNMENT VALIDATION: Check if survey applies to this branch
    const applicableBranchIds = (s as any).applicable_branch_ids || []
    // Empty array means all branches, otherwise check if branch is in the list
    if (applicableBranchIds.length > 0 && !applicableBranchIds.includes(payload.branchId)) {
      throw new Error('This survey is not applicable to the selected branch.')
    }
    const now = new Date()
    const { start, end } = getPeriodRangeForOrg((s as any).frequency, now, org as Tables<'organizations'>)
    
    // CYCLE VALIDATION: Check for existing active audits in the current cycle
    const { data: existingAudits, error: existErr } = await supabase
      .from('audits')
      .select('id, status, due_at, period_start, period_end, is_archived')
      .eq('org_id', payload.orgId)
      .eq('branch_id', payload.branchId)
      .eq('survey_id', payload.surveyId)
      .eq('is_archived', false)
      .gte('period_end', start.toISOString()) // Overlaps with current cycle
      .lte('period_start', end.toISOString())
    
    if (existErr) throw existErr
    
    if (existingAudits && existingAudits.length > 0) {
      // Check if any existing audit blocks creation
      for (const existing of existingAudits) {
        const isDueInFuture = existing.due_at && new Date(existing.due_at) > now
        const isNotOverdue = isDueInFuture
        
        // Block if there's an active, non-overdue audit in this cycle
        // Allow if: audit is overdue (past due date) OR rejected (needs rework)
        if (isNotOverdue && existing.status !== 'REJECTED') {
          throw new Error(
            `An audit for this survey and branch already exists for the current ${(s as any).frequency.toLowerCase()} cycle. ` +
            `You cannot create another until the existing audit is overdue or the next cycle begins.`
          )
        }
      }
    }
    
    const { data, error } = await supabase
      .from('audits')
      .insert({
        org_id: payload.orgId,
        branch_id: payload.branchId,
        survey_id: payload.surveyId,
        survey_version: (s as any).version ?? 1,
        assigned_to: payload.assignedTo,
        status: 'DRAFT',
        responses: {},
        na_reasons: {},
        section_comments: {},
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        period_start: start.toISOString(),
        period_end: end.toISOString(),
        due_at: end.toISOString(),
        is_archived: false,
      } as any)
      .select('*')
      .single()
    if (error) throw error
    return mapAudit(data as Tables<'audits'>)
  },
  async saveAuditProgress(
    auditId: string,
    updates: {
      responses?: Record<string, string>
      naReasons?: Record<string, string>
      sectionComments?: Record<string, string>
    },
  ): Promise<Audit> {
    const supabase = await getSupabase()
    const { data: current, error: cErr } = await supabase.from('audits').select('*').eq('id', auditId).single()
    if (cErr) throw cErr
    const cur = current as Tables<'audits'>
    if (cur.status === 'SUBMITTED' || cur.status === 'APPROVED') {
      return mapAudit(cur)
    }
    const nextStatus = (cur.status === 'DRAFT' || cur.status === 'REJECTED') ? 'IN_PROGRESS' : cur.status
    const next: any = {
      responses: { ...(cur.responses as any || {}), ...(updates.responses || {}) },
      na_reasons: { ...(cur.na_reasons as any || {}), ...(updates.naReasons || {}) },
      section_comments: { ...(cur.section_comments as any || {}), ...(updates.sectionComments || {}) },
      status: nextStatus,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('audits').update(next).eq('id', auditId).select('*').single()
    if (error) throw error
    return mapAudit(data as Tables<'audits'>)
  },
  async adminEditAudit(
    auditId: string,
    updates: { responses?: Record<string, string>; naReasons?: Record<string, string>; sectionComments?: Record<string, string> },
    adminUserId: string,
  ): Promise<Audit> {
    const supabase = await getSupabase()
    const { data: user, error: uErr } = await supabase.from('users').select('id, role').eq('id', adminUserId).maybeSingle()
    if (uErr) throw uErr
    if (!user || (user as any).role !== 'ADMIN') throw new Error('Permission denied: Only admin can edit approved/submitted audits')
    const { data: current, error: cErr } = await supabase.from('audits').select('*').eq('id', auditId).single()
    if (cErr) throw cErr
    const cur = current as Tables<'audits'>
    const next: any = {
      responses: { ...(cur.responses as any || {}), ...(updates.responses || {}) },
      na_reasons: { ...(cur.na_reasons as any || {}), ...(updates.naReasons || {}) },
      section_comments: { ...(cur.section_comments as any || {}), ...(updates.sectionComments || {}) },
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('audits').update(next).eq('id', auditId).select('*').single()
    if (error) throw error
    return mapAudit(data as Tables<'audits'>)
  },
  async manualArchiveAudit(auditId: string, _userId: string): Promise<Audit> {
    const supabase = await getSupabase()
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('audits')
      .update({ is_archived: true, archived_at: now, updated_at: now } as any)
      .eq('id', auditId)
      .select('*')
      .single()
    if (error) throw error
    return mapAudit(data as Tables<'audits'>)
  },

  async deleteAudit(auditId: string): Promise<void> {
    const supabase = await getSupabase()
    await supabase.from('audit_photos').delete().eq('audit_id', auditId)
    const { error } = await supabase.from('audits').delete().eq('id', auditId)
    if (error) throw error
  },

  // Section photos (upload to storage and track in audit_photos)
  async addSectionPhoto(
    auditId: string,
    sectionId: string,
    payload: { filename: string; url: string; uploadedBy: string },
  ): Promise<{ id: string; sectionId: string; filename: string; url: string; uploadedBy: string; uploadedAt: Date }> {
    const supabase = await getSupabase()
    let publicUrl = payload.url
    try {
      // Try to fetch the provided URL (supports blob:, data:, http(s):)
      const resp = await fetch(payload.url)
      const blob = await resp.blob()
      const contentType = blob.type || 'image/jpeg'
      const ext = payload.filename.includes('.') ? payload.filename.split('.').pop()! : (contentType.split('/')[1] || 'jpg')
      const path = `audits/${auditId}/${Date.now()}-${Math.random().toString(36).slice(2,6)}.${ext}`
      const { error: upErr } = await supabase.storage.from('audit-photos').upload(path, blob, { contentType, upsert: true })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('audit-photos').getPublicUrl(path)
      publicUrl = urlData.publicUrl
    } catch {
      // Fallback: keep original URL if upload fails (dev)
    }
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('audit_photos')
      .insert({ audit_id: auditId, section_id: sectionId, filename: payload.filename, url: publicUrl, uploaded_by: payload.uploadedBy, uploaded_at: now } as any)
      .select('*')
      .single()
    if (error) throw error
    return {
      id: (data as Tables<'audit_photos'>).id,
      sectionId,
      filename: payload.filename,
      url: publicUrl,
      uploadedBy: payload.uploadedBy,
      uploadedAt: new Date(now),
    }
  },
  async removeSectionPhoto(_auditId: string, photoId: string): Promise<void> {
    const supabase = await getSupabase()
    const { error } = await supabase.from('audit_photos').delete().eq('id', photoId)
    if (error) throw error
  },

  // Surveys
  async getSurveyById(id: string, orgId?: string) {
    const supabase = await getSupabase()
    let q = supabase.from('surveys').select('*').eq('id', id)
    if (orgId) q = q.eq('org_id', orgId)
    const { data: s, error } = await q.maybeSingle()
    if (error) throw error
    if (!s) return null
    const currentVersion = (s as any).version ?? 1
    const { data: sections, error: e2 } = await supabase
      .from('survey_sections')
      .select('*')
      .eq('survey_id', id)
      .eq('version', currentVersion)
      .order('order_num', { ascending: true })
    if (e2) throw e2
    const sectionIds = (sections || []).map((sec: Tables<'survey_sections'>) => sec.id)
    let questions: Tables<'survey_questions'>[] = []
    if (sectionIds.length) {
      const { data: qs, error: e3 } = await supabase
        .from('survey_questions')
        .select('*')
        .in('section_id', sectionIds)
        .eq('version', currentVersion)
        .order('order_num', { ascending: true })
      if (e3) throw e3
      questions = qs || []
    }
    const bySection: Record<string, any[]> = {}
    questions.forEach((q) => {
      const arr = bySection[q.section_id] || (bySection[q.section_id] = [])
      arr.push({
        id: q.id,
        text: q.question_text,
        type: mapQuestionTypeVal(q.question_type),
        required: q.required,
        order: q.order_num,
        isWeighted: q.is_weighted,
        yesWeight: q.yes_weight ?? undefined,
        noWeight: q.no_weight ?? undefined,
      })
    })
    const survey: any = {
      id: s.id,
      title: s.title,
      description: s.description || '',
      version: s.version,
      sections: (sections || []).map((sec: Tables<'survey_sections'>) => ({
        id: sec.id,
        title: sec.title,
        description: sec.description || undefined,
        questions: bySection[sec.id] || [],
        order: sec.order_num,
      })),
      createdBy: '',
      createdAt: new Date(s.created_at),
      updatedAt: new Date(s.updated_at),
      isActive: s.is_active,
      frequency: (s.frequency?.toLowerCase() as any) ?? 'weekly',
    }
    return survey as any
  },
  async getSurveyByIdAndVersion(id: string, version: number) {
    const supabase = await getSupabase()
    const { data: s, error } = await supabase.from('surveys').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    if (!s) return null
    let targetVersion = version ?? ((s as any).version ?? 1)
    let { data: sections, error: e2 } = await supabase
      .from('survey_sections')
      .select('*')
      .eq('survey_id', id)
      .eq('version', targetVersion)
      .order('order_num', { ascending: true })
    if (e2) throw e2
    // If no sections found for the pinned version, fall back to latest available version
    if (!sections || sections.length === 0) {
      const { data: vers } = await supabase
        .from('survey_sections')
        .select('version')
        .eq('survey_id', id)
        .order('version', { ascending: false })
        .limit(1)
      const latest = vers && vers.length > 0 ? (vers[0] as any).version : null
      if (latest && latest !== targetVersion) {
        targetVersion = latest
        const { data: sec2, error: e2b } = await supabase
          .from('survey_sections')
          .select('*')
          .eq('survey_id', id)
          .eq('version', targetVersion)
          .order('order_num', { ascending: true })
        if (e2b) throw e2b
        sections = sec2 || []
      }
      // Last resort: still empty -> load all sections regardless of version
      if (!sections || sections.length === 0) {
        const { data: secAll, error: e2c } = await supabase
          .from('survey_sections')
          .select('*')
          .eq('survey_id', id)
          .order('order_num', { ascending: true })
        if (e2c) throw e2c
        sections = secAll || []
      }
    }
    const sectionIds = (sections || []).map((sec: Tables<'survey_sections'>) => sec.id)
    let questions: Tables<'survey_questions'>[] = []
    if (sectionIds.length) {
      const { data: qs, error: e3 } = await supabase
        .from('survey_questions')
        .select('*')
        .in('section_id', sectionIds)
        .eq('version', targetVersion)
        .order('order_num', { ascending: true })
      if (e3) throw e3
      questions = qs || []
      // Last resort: if still empty, try without version filter
      if (!questions || questions.length === 0) {
        const { data: qsAll, error: e3b } = await supabase
          .from('survey_questions')
          .select('*')
          .in('section_id', sectionIds)
          .order('order_num', { ascending: true })
        if (e3b) throw e3b
        questions = qsAll || []
      }
    }
    const bySection: Record<string, any[]> = {}
    questions.forEach((q) => {
      const arr = bySection[q.section_id] || (bySection[q.section_id] = [])
      arr.push({
        id: q.id,
        text: q.question_text,
        type: mapQuestionTypeVal(q.question_type),
        required: q.required,
        order: q.order_num ?? 0,
        isWeighted: q.is_weighted ?? false,
        yesWeight: q.yes_weight ?? undefined,
        noWeight: q.no_weight ?? undefined,
      })
    })
    const survey: any = {
      id: s.id,
      title: s.title,
      description: s.description || '',
      version: targetVersion,
      sections: (sections || []).map((sec: Tables<'survey_sections'>) => ({
        id: sec.id,
        title: sec.title,
        description: sec.description || undefined,
        order: sec.order_num ?? 0,
        questions: bySection[sec.id] || [],
      })),
      createdBy: (s as any).created_by || 'system',
      createdAt: new Date(s.created_at),
      updatedAt: new Date(s.updated_at),
      isActive: s.is_active,
      frequency: (s.frequency?.toLowerCase() as any) ?? 'weekly',
      applicableBranchIds: (s as any).applicable_branch_ids || [],
    }
    return survey as any
  },
  async getSurveys(orgId?: string) {
    const supabase = await getSupabase()
    let q = supabase.from('surveys').select('*')
    
    // Filter by org unless Super Admin in global view (orgId = undefined)
    if (orgId) {
      q = q.eq('org_id', orgId)
    }
    
    const { data, error } = await q.order('updated_at', { ascending: false })
    if (error) throw error
    
    // Load sections and questions for all surveys
    const surveys = await Promise.all((data || []).map(async (s: Tables<'surveys'>) => {
      // Load sections
      const { data: sections, error: secError } = await supabase
        .from('survey_sections')
        .select('*')
        .eq('survey_id', s.id)
        .eq('version', (s as any).version ?? 1)
        .order('order_num', { ascending: true })
      if (secError) throw secError
      
      // Load questions
      const { data: questions, error: qError } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', s.id)
        .eq('version', (s as any).version ?? 1)
        .order('order_num', { ascending: true })
      if (qError) throw qError
      
      // Group questions by section
      const bySection: Record<string, any[]> = {}
      ;(questions || []).forEach((q: Tables<'survey_questions'>) => {
        const arr = bySection[q.section_id] || (bySection[q.section_id] = [])
        arr.push({
          id: q.id,
          text: q.question_text,
          type: mapQuestionTypeVal(q.question_type),
          required: q.required,
          order: q.order_num ?? 0,
          isWeighted: (q as any).is_weighted ?? false,
          yesWeight: (q as any).yes_weight ?? undefined,
          noWeight: (q as any).no_weight ?? undefined,
        })
      })
      
      return {
        id: s.id,
        title: s.title,
        description: s.description || '',
        version: s.version,
        sections: (sections || []).map((sec: Tables<'survey_sections'>) => ({
          id: sec.id,
          title: sec.title,
          description: sec.description || undefined,
          questions: bySection[sec.id] || [],
          order: sec.order_num,
        })),
        createdBy: '',
        createdAt: new Date(s.created_at),
        updatedAt: new Date(s.updated_at),
        isActive: s.is_active,
        frequency: (s.frequency?.toLowerCase() as any) ?? 'weekly',
        applicableBranchIds: (s as any).applicable_branch_ids || [],
      }
    }))
    
    return surveys
  },

  // Get surveys available for a specific branch (respects applicableBranchIds)
  async getAvailableSurveysForBranch(branchId: string, orgId?: string): Promise<Survey[]> {
    const allSurveys = await this.getSurveys(orgId)
    
    // Filter surveys: include if applicableBranchIds is empty (all branches) or includes this branch
    return allSurveys.filter(survey => {
      const applicableBranchIds = survey.applicableBranchIds || []
      return survey.isActive && (applicableBranchIds.length === 0 || applicableBranchIds.includes(branchId))
    })
  },

  // Get survey results for analytics (admin/reports)
  async getSurveyResults(surveyId: string, filters: { 
    dateStart: Date, 
    dateEnd: Date, 
    branchIds?: string[], 
    zoneIds?: string[],
    statuses?: string[],
    orgId?: string 
  }): Promise<any[]> {
    const supabase = await getSupabase()
    
    // If zone filter is provided, get branches in those zones first
    let branchIdsFromZones: string[] = []
    if (filters.zoneIds && filters.zoneIds.length > 0) {
      const { data: zonesData } = await supabase
        .from('zones')
        .select('branch_ids')
        .in('id', filters.zoneIds)
      
      if (zonesData) {
        branchIdsFromZones = zonesData.flatMap((z: any) => z.branch_ids || [])
      }
    }
    
    // Combine branch filters
    const combinedBranchIds = filters.branchIds && filters.branchIds.length > 0
      ? filters.branchIds
      : branchIdsFromZones.length > 0
      ? branchIdsFromZones
      : undefined
    
    let query = supabase
      .from('audits')
      .select(`
        *,
        branch:branches!inner(id, name),
        auditor:users!audits_assigned_to_fkey(id, full_name)
      `)
      .eq('survey_id', surveyId)
      .gte('updated_at', filters.dateStart.toISOString())
      .lte('updated_at', filters.dateEnd.toISOString())
    
    // Filter by organization
    if (filters.orgId) {
      query = query.eq('org_id', filters.orgId)
    }
    
    // Filter by branches (including those from zones)
    if (combinedBranchIds && combinedBranchIds.length > 0) {
      query = query.in('branch_id', combinedBranchIds)
    }
    
    // Filter by status (DB enum uses UPPERCASE values)
    if (filters.statuses && filters.statuses.length > 0) {
      const upperStatuses = filters.statuses.map(s => (typeof s === 'string' ? s.toUpperCase() : s))
      query = query.in('status', upperStatuses as any)
    }
    
    const { data, error } = await query.order('updated_at', { ascending: false })
    
    if (error) throw error
    
    return data || []
  },

  // Activity logs (with structured fields and filters)
  async getActivityLogs(
    entityId?: string,
    orgId?: string,
    filters?: { surveyId?: string; branchId?: string; actionPrefix?: string; limit?: number }
  ) {
    const supabase = await getSupabase()
    const limit = filters?.limit ?? 50
    // Structured-first: use survey_id/branch_id (now available), with safe fallback to legacy entity filters
    try {
      let q1 = supabase.from('activity_logs').select('*')
      if (entityId) q1 = q1.eq('entity_id', entityId)
      if (orgId) q1 = q1.eq('org_id', orgId)
      if (filters?.surveyId) q1 = q1.eq('survey_id', filters.surveyId)
      if (filters?.branchId) q1 = q1.eq('branch_id', filters.branchId)
      if (filters?.actionPrefix) q1 = q1.ilike('action', `${filters.actionPrefix}%`)
      const { data, error } = await q1.order('created_at', { ascending: false }).limit(limit)
      if (error) throw error
      return (data || []).map((r: Tables<'activity_logs'>) => ({
        id: r.id,
        userId: r.user_id || '',
        action: r.action,
        details: r.details || '',
        entityType: r.entity_type || '',
        entityId: r.entity_id || '',
        surveyId: (r as any).survey_id || undefined,
        branchId: (r as any).branch_id || undefined,
        timestamp: new Date(r.created_at),
      }))
    } catch (_e) {
      // Fallback: legacy
      let q2 = supabase.from('activity_logs').select('*')
      if (entityId) q2 = q2.eq('entity_id', entityId)
      if (orgId) q2 = q2.eq('org_id', orgId)
      if (filters?.surveyId) q2 = q2.eq('entity_type', 'SURVEY').eq('entity_id', filters.surveyId)
      if (filters?.branchId) q2 = q2.eq('entity_type', 'BRANCH').eq('entity_id', filters.branchId)
      if (filters?.actionPrefix) q2 = q2.ilike('action', `${filters.actionPrefix}%`)
      const { data, error } = await q2.order('created_at', { ascending: false }).limit(limit)
      if (error) throw error
      return (data || []).map((r: Tables<'activity_logs'>) => ({
        id: r.id,
        userId: r.user_id || '',
        action: r.action,
        details: r.details || '',
        entityType: r.entity_type || '',
        entityId: r.entity_id || '',
        surveyId: (r as any).survey_id || undefined,
        branchId: (r as any).branch_id || undefined,
        timestamp: new Date(r.created_at),
      }))
    }
  },

  async createActivityLog(
    userId: string,
    action: string,
    details: string,
    entityType: string,
    entityId: string,
    orgId?: string,
    extra?: { surveyId?: string; branchId?: string }
  ) {
    const supabase = await getSupabase()
    // Try structured insert first; if columns are missing, retry without them
    const payload: any = {
      user_id: userId,
      action,
      details,
      entity_type: entityType,
      entity_id: entityId,
      org_id: orgId || null,
      survey_id: extra?.surveyId || null,
      branch_id: extra?.branchId || null,
    }
    let { error } = await supabase.from('activity_logs').insert(payload as any)
    if (error && String(error.message || '').toLowerCase().includes('column') && String(error.message || '').toLowerCase().includes('does not exist')) {
      // Remove structured fields and retry
      const fallback: any = { ...payload }
      delete fallback.survey_id
      delete fallback.branch_id
      const res2 = await supabase.from('activity_logs').insert(fallback as any)
      error = res2.error
    }
    if (error) logger.error('Failed to create activity log', error, { context: 'SupabaseAPI' })
  },

  // Zones CRUD
  async createZone(payload: { orgId: string; name: string; description?: string; branchIds?: string[] }): Promise<Zone> {
    const supabase = await getSupabase()
    const { data: zone, error } = await supabase
      .from('zones')
      .insert({ org_id: payload.orgId, name: payload.name, description: payload.description || null } as any)
      .select('*')
      .single()
    if (error) throw error
    const zid = (zone as Tables<'zones'>).id
    if (payload.branchIds?.length) {
      const rows = payload.branchIds.map(bid => ({ zone_id: zid, branch_id: bid }))
      const { error: e2 } = await supabase.from('zone_branches').insert(rows as any)
      if (e2) throw e2
    }
    const branchIds = payload.branchIds || []
    return mapZone(zone as Tables<'zones'>, branchIds)
  },
  async updateZone(id: string, updates: Partial<Pick<Zone, 'name' | 'description' | 'branchIds'>>): Promise<Zone> {
    const supabase = await getSupabase()
    if (updates.name != null || updates.description != null) {
      const { error } = await supabase
        .from('zones')
        .update({
          ...(updates.name != null ? { name: updates.name } : {}),
          ...(updates.description != null ? { description: updates.description } : {}),
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', id)
      if (error) throw error
    }
    if (updates.branchIds) {
      // Load current links for diff
      const { data: curLinks, error: curErr } = await supabase
        .from('zone_branches')
        .select('branch_id')
        .eq('zone_id', id)
      if (curErr) throw curErr
      const prev = (curLinks || []).map((l: any) => l.branch_id)
      const next = updates.branchIds
      const removed = prev.filter((bid: string) => !next.includes(bid))
      const added = next.filter((bid: string) => !prev.includes(bid))

      // If removing branches, ensure active branches remain covered
      if (removed.length) {
        const { data: activeRemoved, error: actErr } = await supabase
          .from('branches')
          .select('id, name, is_active')
          .in('id', removed)
        if (actErr) throw actErr
        const activeList = (activeRemoved || []).filter((b: any) => b.is_active)
        if (activeList.length) {
          const activeIds = activeList.map((b: any) => b.id)
          // Other zones still linking these branches (excluding this zone)
          const { data: otherZb, error: ozErr } = await supabase
            .from('zone_branches')
            .select('branch_id, zone_id')
            .in('branch_id', activeIds)
            .neq('zone_id', id)
          if (ozErr) throw ozErr
          const otherZonesByBranch = new Map<string, string[]>()
          ;(otherZb || []).forEach((r: any) => {
            const arr = otherZonesByBranch.get(r.branch_id) || []
            arr.push(r.zone_id)
            otherZonesByBranch.set(r.branch_id, arr)
          })
          // Pull all assignments once
          const { data: assigns, error: asErr } = await supabase
            .from('auditor_assignments')
            .select('branch_ids, zone_ids')
          if (asErr) throw asErr
          const isCoveredAfterRemoval = (branchId: string) => {
            return (assigns || []).some((a: any) => {
              const hasDirect = Array.isArray(a.branch_ids) && a.branch_ids.includes(branchId)
              if (hasDirect) return true
              const otherZones = otherZonesByBranch.get(branchId) || []
              return Array.isArray(a.zone_ids) && a.zone_ids.some((z: string) => otherZones.includes(z))
            })
          }
          const uncovered = activeList.filter((b: any) => !isCoveredAfterRemoval(b.id))
          if (uncovered.length) {
            const names = uncovered.map((b: any) => b.name).join(', ')
            try {
              const { data: auth } = await supabase.auth.getUser()
              await this.createActivityLog(auth?.user?.id || '', 'ZONE_CHANGE_BLOCKED_ACTIVE_BRANCHES', `Zone update would uncover active branches: ${names}`, 'zone', id)
            } catch {}
            throw new Error(`Zone change blocked. These active branches would have no auditors: ${names}. Assign auditors or deactivate them first.`)
          }
        }
      }

      // Apply diff: insert new then delete removed
      if (added.length) {
        const addRows = added.map(bid => ({ zone_id: id, branch_id: bid }))
        const { error: addErr } = await supabase.from('zone_branches').insert(addRows as any)
        if (addErr) throw addErr
      }
      if (removed.length) {
        const { error: delErr } = await supabase
          .from('zone_branches')
          .delete()
          .eq('zone_id', id)
          .in('branch_id', removed)
        if (delErr) throw delErr
      }
    }

    // Return fresh
    const { data: z, error: zErr } = await supabase.from('zones').select('*').eq('id', id).single()
    if (zErr) throw zErr
    const { data: links, error: lErr } = await supabase.from('zone_branches').select('*').eq('zone_id', id)
    if (lErr) throw lErr
    return mapZone(z as Tables<'zones'>, (links || []).map((l: Tables<'zone_branches'>) => l.branch_id))
  },

  async deleteZone(id: string): Promise<void> {
    const supabase = await getSupabase()
    // Clean links and assignments referencing zone
    await supabase.from('zone_assignments').delete().eq('zone_id', id)
    await supabase.from('zone_branches').delete().eq('zone_id', id)
    const { error } = await supabase.from('zones').delete().eq('id', id)
    if (error) throw error
  },

  // Surveys CRUD
  async createSurvey(payload: { title: string; description: string; sections: any[]; createdBy: string; orgId: string; applicableBranchIds?: string[] }): Promise<Partial<Survey> & { id: string }> {
    const supabase = await getSupabase()
    const orgId = payload.orgId
    if (!orgId) throw new Error('Organization context required for survey creation')
    const now = new Date().toISOString()
    const { data: s, error } = await supabase
      .from('surveys')
      .insert({
        org_id: orgId,
        title: payload.title,
        description: payload.description || null,
        is_active: true,
        version: 1,
        frequency: 'UNLIMITED' as any,
        applicable_branch_ids: (payload.applicableBranchIds && payload.applicableBranchIds.length ? payload.applicableBranchIds : []) as any,
        created_at: now,
        updated_at: now,
      } as any)
      .select('*')
      .single()
    if (error) throw error
    const surveyId = (s as Tables<'surveys'>).id
    // sections optional; initial create from ManageSurveyTemplates uses []
    if (payload.sections?.length) {
      // Insert sections then questions
      const secRows = payload.sections.map((sec: any, idx: number) => ({
        survey_id: surveyId,
        title: sec.title || `Page ${idx + 1}`,
        description: sec.description || null,
        order_num: idx,
        version: 1,
      }))
      const { data: insertedSecs, error: sErr } = await supabase.from('survey_sections').insert(secRows as any).select('*')
      if (sErr) throw sErr
      for (let i = 0; i < (payload.sections || []).length; i++) {
        const srcSec = payload.sections[i]
        const dstSec = (insertedSecs || [])[i] as Tables<'survey_sections'>
        const qRows = (srcSec.questions || []).map((q: any, qIdx: number) => ({
          survey_id: surveyId,
          section_id: dstSec.id,
          question_text: q.text || '',
          question_type: q.type || 'yes_no',
          required: !!q.required,
          order_num: q.order ?? qIdx,
          is_weighted: !!q.isWeighted,
          yes_weight: q.yesWeight ?? null,
          no_weight: q.noWeight ?? null,
          version: 1,
        }))
        if (qRows.length) {
          const { error: qErr } = await supabase.from('survey_questions').insert(qRows as any)
          if (qErr) throw qErr
        }
      }
    }
    return { id: surveyId }
  },
  async duplicateSurvey(id: string, _userId: string, orgId: string): Promise<void> {
    const supabase = await getSupabase()
    const { data: s, error } = await supabase.from('surveys').select('*').eq('id', id).single()
    if (error || !s) throw error || new Error('Survey not found')
    if (((s as any).org_id as string) !== orgId) throw new Error('Organization mismatch')
    const currentVersion = (s as any).version ?? 1
    const { data: sections, error: e2 } = await supabase
      .from('survey_sections')
      .select('*')
      .eq('survey_id', id)
      .eq('version', currentVersion)
      .order('order_num', { ascending: true })
    if (e2) throw e2
    const secIds = (sections || []).map((sec: Tables<'survey_sections'>) => sec.id)
    let questions: Tables<'survey_questions'>[] = []
    if (secIds.length) {
      const { data: qs, error: e3 } = await supabase
        .from('survey_questions')
        .select('*')
        .in('section_id', secIds)
        .eq('version', currentVersion)
        .order('order_num', { ascending: true })
      if (e3) throw e3
      questions = qs || []
    }
    const now = new Date().toISOString()
    // New copy starts at version 1 for a clean history
    const { data: ns, error: nErr } = await supabase.from('surveys').insert({
      org_id: orgId,
      title: `Copy of ${(s as Tables<'surveys'>).title}`,
      description: (s as Tables<'surveys'>).description || null,
      is_active: (s as Tables<'surveys'>).is_active,
      version: 1,
      frequency: (s as Tables<'surveys'>).frequency,
      created_at: now,
      updated_at: now,
    } as any).select('*').single()
    if (nErr) throw nErr
    const newSurveyId = (ns as Tables<'surveys'>).id
    // rebuild sections and questions
    const sectionMap: Record<string, string> = {}
    const secRows = (sections || []).map((sec: Tables<'survey_sections'>) => ({
      survey_id: newSurveyId,
      title: sec.title,
      description: sec.description,
      order_num: sec.order_num,
      version: 1,
    }))
    const { data: insSecs, error: sInsErr } = await supabase.from('survey_sections').insert(secRows as any).select('*')
    if (sInsErr) throw sInsErr
    insSecs?.forEach((row: any, idx: number) => { sectionMap[(sections as any)[idx].id] = row.id })
    const qRows = (questions || []).map((q) => ({
      survey_id: newSurveyId,
      section_id: sectionMap[q.section_id],
      question_text: q.question_text,
      question_type: q.question_type,
      required: q.required,
      order_num: q.order_num,
      is_weighted: q.is_weighted,
      yes_weight: q.yes_weight,
      no_weight: q.no_weight,
      version: 1,
    }))
    if (qRows.length) {
      const { error: qInsErr } = await supabase.from('survey_questions').insert(qRows as any)
      if (qInsErr) throw qInsErr
    }
  },
  async updateSurvey(id: string, updates: Partial<{ title: string; description: string; isActive: boolean; sections: any[]; frequency: any; applicableBranchIds: string[] }>, expectedOrgId?: string): Promise<void> {
    const supabase = await getSupabase()
    const now = new Date().toISOString()
    const { data: orgRow, error: orgErr } = await supabase.from('surveys').select('org_id').eq('id', id).maybeSingle()
    if (orgErr) throw orgErr
    if (!orgRow) throw new Error('Survey not found')
    if (expectedOrgId && ((orgRow as any).org_id as string) !== expectedOrgId) throw new Error('Organization mismatch')
    const base: any = { updated_at: now }
    if (updates.title != null) base.title = updates.title
    if (updates.description != null) base.description = updates.description
    if (updates.isActive != null) base.is_active = updates.isActive
    if (updates.frequency != null) base.frequency = String(updates.frequency).toUpperCase()
    if (updates.applicableBranchIds != null) base.applicable_branch_ids = updates.applicableBranchIds as any
    // If only metadata changed, update surveys row
    if (!updates.sections) {
      if (Object.keys(base).length > 1) {
        const { error } = await supabase.from('surveys').update(base).eq('id', id)
        if (error) throw error
      }
      return
    }
    // Sections provided: try RPC to bump version; if it fails, fall back to manual versioning
    const { data: surveyRow } = await supabase.from('surveys').select('org_id, version').eq('id', id).maybeSingle()
    const orgId = (surveyRow as any)?.org_id || null
    const currentVersion = Number((surveyRow as any)?.version || 0)
    const payloadSections = JSON.parse(JSON.stringify(updates.sections))
    let newVersionNum: number | null = null
    let publishedVia: 'rpc' | 'fallback' = 'rpc'
    // Attempt RPC first
    const { data: rpcVersion, error: rpcErr } = await (supabase as any).rpc('publish_survey_version', {
      p_survey_id: id,
      p_sections: payloadSections,
      p_title: base.title ?? null,
      p_description: base.description ?? null,
      p_is_active: base.is_active ?? null,
      p_frequency: base.frequency ?? null,
      p_applicable_branch_ids: base.applicable_branch_ids ?? null,
    })
    if (rpcErr) {
      // Fallback: manual version bump + inserts (best-effort when RPC missing or permission denied)
      publishedVia = 'fallback'
      newVersionNum = (currentVersion || 0) + 1
      // Update surveys row with new version and metadata
      const { error: updErr } = await supabase.from('surveys').update({
        ...(base || {}),
        version: newVersionNum,
      } as any).eq('id', id)
      if (updErr) throw updErr
      // Insert sections and questions for new version
      const secRows = (payloadSections || []).map((sec: any, idx: number) => ({
        survey_id: id,
        title: sec.title || `Page ${idx + 1}`,
        description: sec.description || null,
        order_num: idx,
        version: newVersionNum,
      }))
      const { data: insertedSecs, error: sErr } = await supabase.from('survey_sections').insert(secRows as any).select('*')
      if (sErr) throw sErr
      // Map questions per inserted section order
      for (let i = 0; i < (payloadSections || []).length; i++) {
        const srcSec = payloadSections[i]
        const dstSec = (insertedSecs || [])[i] as Tables<'survey_sections'>
        const qRows = (srcSec.questions || []).map((q: any, qIdx: number) => ({
          survey_id: id,
          section_id: dstSec.id,
          question_text: q.text || '',
          question_type: String(q.type || 'yes_no').toLowerCase(),
          required: !!q.required,
          order_num: q.order ?? qIdx,
          is_weighted: !!q.isWeighted,
          yes_weight: q.yesWeight ?? 0,
          no_weight: q.noWeight ?? 0,
          version: newVersionNum,
        }))
        if (qRows.length) {
          const { error: qErr } = await supabase.from('survey_questions').insert(qRows as any)
          if (qErr) throw qErr
        }
      }
    } else {
      newVersionNum = (rpcVersion as number) || null
    }
    // Activity log (do not block on errors)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const uid = auth?.user?.id || ''
      await this.createActivityLog(
        uid,
        'SURVEY_PUBLISHED',
        newVersionNum ? `Published survey version v${newVersionNum} (${publishedVia})` : `Published survey (${publishedVia})`,
        'survey',
        id,
        orgId || undefined,
        { surveyId: id }
      )
    } catch {}
  },
  async deleteSurvey(id: string): Promise<void> {
    const supabase = await getSupabase()
    await supabase.from('survey_questions').delete().eq('survey_id', id)
    await supabase.from('survey_sections').delete().eq('survey_id', id)
    const { error } = await supabase.from('surveys').delete().eq('id', id)
    if (error) throw error
  },

  // User profile
  async setUserAvatar(id: string, avatarUrl: string | null) {
    const supabase = await getSupabase()
    let finalUrl: string | null = avatarUrl
    if (avatarUrl && avatarUrl.startsWith('data:')) {
      finalUrl = await uploadProfileDataUrl('avatars', id, avatarUrl)
    }
    const { data, error } = await supabase.from('users').update({ avatar_url: finalUrl, updated_at: new Date().toISOString() } as any).eq('id', id).select('*').single()
    if (error) throw error
    return mapUser(data as any)
  },
  async setUserSignature(id: string, signatureUrl: string | null) {
    const supabase = await getSupabase()
    let finalUrl: string | null = signatureUrl
    if (signatureUrl && signatureUrl.startsWith('data:')) {
      finalUrl = await uploadProfileDataUrl('signatures', id, signatureUrl)
    }
    const { data, error } = await supabase.from('users').update({ signature_url: finalUrl, updated_at: new Date().toISOString() } as any).eq('id', id).select('*').single()
    if (error) throw error
    return mapUser(data as any)
  },
  async createUser(payload: {
    id: string
    email: string
    name: string
    role: string
    orgId: string | null
    isActive: boolean
  }): Promise<User> {
    const supabase = await getSupabase()
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: payload.id,
        email: payload.email,
        full_name: payload.name,
        role: payload.role,
        org_id: payload.orgId,
        is_active: payload.isActive,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single()
    
    if (error) throw error
    return mapUser(data as Tables<'users'>)
  },

  async updateUser(id: string, updates: Partial<{ name: string; email: string; role: UserRole; isActive: boolean; org_id: string; phone: string }>) {
    const supabase = await getSupabase()

    // If email is being changed, update it in auth.users as well
    if (updates.email) {
      const { error: authError } = await supabase.auth.updateUser({ email: updates.email })
      if (authError) {
        logger.error('Failed to update auth user email', authError, { context: 'SupabaseAPI' })
        // Do not proceed with DB update if auth update fails
        throw authError
      }
    }
    const base: any = { updated_at: new Date().toISOString() }
    const { data: currentUserRow } = await supabase.from('users').select('id, role, full_name').eq('id', id).maybeSingle()
    const nextRole = updates.role ? String(updates.role).toUpperCase() : undefined
    if (currentUserRow && currentUserRow.role === 'AUDITOR' && nextRole && nextRole !== 'AUDITOR') {
      const res = await this._findUncoveredActiveBranchesIfAuditorRemoved(id)
      if (res.ids.length) {
        try {
          const { data: auth } = await supabase.auth.getUser()
          await this.createActivityLog(auth?.user?.id || '', 'AUDITOR_ROLE_CHANGE_BLOCKED_ACTIVE_BRANCHES', `Blocked role change for auditor; uncovered branches: ${res.names.join(', ')}`, 'user', id)
        } catch {}
        throw new Error(`Cannot change role; this would leave these active branches without auditors: ${res.names.join(', ')}`)
      }
    }
    if (currentUserRow && currentUserRow.role === 'AUDITOR' && updates.isActive === false) {
      const res = await this._findUncoveredActiveBranchesIfAuditorRemoved(id)
      if (res.ids.length) {
        try {
          const { data: auth } = await supabase.auth.getUser()
          await this.createActivityLog(auth?.user?.id || '', 'AUDITOR_DISABLE_BLOCKED_ACTIVE_BRANCHES', `Blocked disabling auditor; uncovered branches: ${res.names.join(', ')}`, 'user', id)
        } catch {}
        throw new Error(`Cannot disable this auditor; this would leave these active branches without auditors: ${res.names.join(', ')}`)
      }
    }
    if (updates.name != null) base.full_name = updates.name
    if (updates.email != null) base.email = updates.email
    if (updates.role != null) base.role = updates.role.toUpperCase()
    if (updates.isActive != null) base.is_active = updates.isActive
    if (updates.org_id != null) base.org_id = updates.org_id
    const { data, error } = await supabase.from('users').update(base).eq('id', id).select('*').single()
    if (error) throw error
    return mapUser(data as any)
  },

  // Organization update
  async updateOrganization(id: string, updates: Partial<Pick<Organization, 'name' | 'description' | 'timeZone' | 'weekStartsOn' | 'gatingPolicy'> & { address?: string; logoUrl?: string }>): Promise<Organization> {
    const supabase = await getSupabase()
    const base: any = { updated_at: new Date().toISOString() }
    if (updates.name != null) base.name = updates.name
    if (updates.timeZone != null) base.time_zone = updates.timeZone
    if (updates.weekStartsOn != null) base.week_starts_on = updates.weekStartsOn
    if (updates.gatingPolicy != null) base.gating_policy = updates.gatingPolicy
    if (updates.address != null) base.address = updates.address
    if (updates.logoUrl != null) base.logo_url = updates.logoUrl
    const { data, error } = await supabase.from('organizations').update(base).eq('id', id).select('*').single()
    if (error) throw error
    return mapOrganization(data as Tables<'organizations'>)
  },

  // Upload organization logo
  async uploadOrganizationLogo(orgId: string, file: File): Promise<string> {
    const supabase = await getSupabase()
    const fileExt = file.name.split('.').pop()
    const fileName = `${orgId}-${Date.now()}.${fileExt}`
    const filePath = `organization-logos/${fileName}`

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from('public')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('public')
      .getPublicUrl(filePath)

    return publicUrl
  },

  // Delete organization logo
  async deleteOrganizationLogo(logoUrl: string): Promise<void> {
    const supabase = await getSupabase()
    // Extract file path from URL
    const urlParts = logoUrl.split('/public/')
    if (urlParts.length < 2) return
    
    const filePath = urlParts[1]
    const { error } = await supabase.storage
      .from('public')
      .remove([filePath])

    if (error) logger.error('Failed to delete logo', error, { context: 'SupabaseAPI' })
  },

  // User management functions
  async inviteUser(email: string, name: string, role: UserRole): Promise<User> {
    const supabase = await getSupabase()
    
    // Get current user's org
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) throw new Error('Not authenticated')
    
    const { data: userData } = await supabase.from('users').select('org_id').eq('id', currentUser.id).single()
    if (!userData) throw new Error('User not found')

    // Check if user already exists
    const { data: existingUser } = await supabase.from('users').select('email').eq('email', email).single()
    if (existingUser) throw new Error('User with this email already exists')

    // Call Edge Function to send invitation
    // This uses service role key securely on the server side
    const { data, error } = await supabase.functions.invoke('invite-user', {
      body: {
        email,
        name,
        role,
        orgId: userData.org_id
      }
    })

    if (error) throw new Error(error.message || 'Failed to send invitation')
    if (data.error) throw new Error(data.error)
    
    return mapUser(data.user)
  },

  async deleteUser(userId: string): Promise<void> {
    const supabase = await getSupabase()
    const { data: userRow } = await supabase.from('users').select('id, role, full_name').eq('id', userId).maybeSingle()
    if (userRow && userRow.role === 'AUDITOR') {
      const res = await this._findUncoveredActiveBranchesIfAuditorRemoved(userId)
      if (res.ids.length) {
        try {
          const { data: auth } = await supabase.auth.getUser()
          await this.createActivityLog(auth?.user?.id || '', 'AUDITOR_DELETE_BLOCKED_ACTIVE_BRANCHES', `Blocked auditor deletion; uncovered branches: ${res.names.join(', ')}`, 'user', userId)
        } catch {}
        throw new Error(`Cannot delete this auditor; this would leave these active branches without auditors: ${res.names.join(', ')}`)
      }
    }
    const { error } = await supabase.from('users').delete().eq('id', userId)
    if (error) throw error
  },

  async resendInvitation(userId: string): Promise<void> {
    const supabase = await getSupabase()
    
    // Get user details
    const { data: user } = await supabase.from('users').select('email, full_name').eq('id', userId).single()
    if (!user) throw new Error('User not found')
    
    // Note: Actual email sending requires either:
    // 1. Supabase Auth Admin API to resend magic link
    // 2. Custom email service (SendGrid, Resend, etc.)
    // 3. Edge Function to handle invitation emails
    
    // For now, we'll log this action (can be picked up by monitoring)
    logger.info(`Resend invitation: ${user.email}`, { context: 'SupabaseAPI' })
    
    // In production, implement one of:
    // await supabase.auth.admin.generateLink({ type: 'magiclink', email: user.email })
    // await sendInvitationEmail(user.email, user.full_name)
  },

  // ===================================
  // Branch Manager Assignments
  // ===================================
  async getAllBranchManagerAssignments() {
    const supabase = await getSupabase()
    
    // NOTE: branch_manager_assignments table doesn't have org_id column
    // It's org-scoped implicitly via:
    // - branch_id -> branches.org_id
    // - manager_id -> users.org_id
    // RLS policies on branches and users tables enforce org isolation
    // (orgId parameter removed as it's not needed - RLS handles filtering)
    
    const { data, error } = await supabase
      .from('branch_manager_assignments')
      .select('*')
      .order('assigned_at', { ascending: false })
    
    if (error) throw error
    return (data || []).map((row: any) => ({
      id: row.id,
      branchId: row.branch_id,
      managerId: row.manager_id,
      assignedBy: row.assigned_by,
      assignedAt: new Date(row.assigned_at),
      isActive: row.is_active ?? true, // Default to true if not set
    }))
  },

  async getBranchManagerAssignments(branchId: string) {
    const supabase = await getSupabase()
    const { data, error } = await supabase
      .from('branch_manager_assignments')
      .select('*')
      .eq('branch_id', branchId)
      .order('assigned_at', { ascending: false })
    
    if (error) throw error
    return (data || []).map((row: any) => ({
      id: row.id,
      branchId: row.branch_id,
      managerId: row.manager_id,
      assignedBy: row.assigned_by,
      assignedAt: new Date(row.assigned_at),
      isActive: row.is_active ?? true, // Default to true if not set
    }))
  },

  async getManagerBranchAssignments(managerId: string) {
    const supabase = await getSupabase()
    const { data, error } = await supabase
      .from('branch_manager_assignments')
      .select('*')
      .eq('manager_id', managerId)
      .order('assigned_at', { ascending: false})
    
    if (error) throw error
    return (data || []).map((row: any) => ({
      id: row.id,
      branchId: row.branch_id,
      managerId: row.manager_id,
      assignedBy: row.assigned_by,
      assignedAt: new Date(row.assigned_at),
      isActive: row.is_active ?? true, // Default to true if not set
    }))
  },

  async assignBranchManager(branchId: string, managerId: string, assignedBy: string): Promise<void> {
    const supabase = await getSupabase()
    
    // Check if assignment already exists
    const { data: existing } = await supabase
      .from('branch_manager_assignments')
      .select('id')
      .eq('branch_id', branchId)
      .eq('manager_id', managerId)
      .single()
    
    if (existing) {
      // Assignment already exists, no need to create
      return
    }
    
    const { error } = await supabase
      .from('branch_manager_assignments')
      .insert({
        branch_id: branchId,
        manager_id: managerId,
        assigned_by: assignedBy,
      })
    
    if (error) throw error
  },

  async unassignBranchManager(branchId: string, managerId: string, _unassignedBy: string): Promise<void> {
    const supabase = await getSupabase()
    const { error } = await supabase
      .from('branch_manager_assignments')
      .delete()
      .eq('branch_id', branchId)
      .eq('manager_id', managerId)
    
    if (error) throw error
  },

  async getBranchesForManager(managerId: string): Promise<Branch[]> {
    const supabase = await getSupabase()
    // Get all branch assignments for this manager
    const { data: assignments, error: assignmentError } = await supabase
      .from('branch_manager_assignments')
      .select('branch_id')
      .eq('manager_id', managerId)
    
    if (assignmentError) throw assignmentError
    
    if (!assignments || assignments.length === 0) {
      return []
    }
    
    // Get the actual branch objects
    const branchIds = assignments.map((a: {branch_id: string}) => a.branch_id)
    const { data: branches, error: branchError } = await supabase
      .from('branches')
      .select('*')
      .in('id', branchIds)
    
    if (branchError) throw branchError
    return (branches || []).map(mapBranch)
  },

  // Notifications
  async getNotifications(_userId: string, options?: { unreadOnly?: boolean; limit?: number; offset?: number }) {
    const supabase = await getSupabase()
    // Prefer filtering by current auth user to reduce payload and avoid public/auth ID mismatch
    const { data: authData } = await supabase.auth.getUser()
    const currentUid = authData?.user?.id
    // Try to also resolve the mapped application user id (if schema uses public.users)
    let mappedAppUserId: string | undefined
    if (currentUid) {
      try {
        const { data: appUser } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', currentUid)
          .maybeSingle()
        mappedAppUserId = appUser?.id
      } catch {}
    }

    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
    if (typeof options?.limit === 'number') {
      const from = Math.max(0, options?.offset || 0)
      const to = from + Math.max(1, options.limit) - 1
      query = query.range(from, to)
    } else {
      query = query.limit(100)
    }
    if (options?.unreadOnly) {
      query = query.eq('is_read', false)
    }
    const { data, error } = currentUid
      ? await query.in('user_id', [currentUid, mappedAppUserId].filter(Boolean) as string[])
      : await query
    
    if (error) throw error
    return (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      link: row.link,
      relatedId: row.related_id,
      isRead: row.is_read,
      createdAt: new Date(row.created_at),
      readAt: row.read_at ? new Date(row.read_at) : undefined,
      requiresAction: row.requires_action || false,
      actionType: row.action_type,
      actionCompletedAt: row.action_completed_at ? new Date(row.action_completed_at) : undefined,
    }))
  },

  async getAllNotifications(options?: { limit?: number; offset?: number }) {
    const supabase = await getSupabase()
    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
    if (typeof options?.limit === 'number') {
      const from = Math.max(0, options?.offset || 0)
      const to = from + Math.max(1, options.limit) - 1
      query = query.range(from, to)
    } else {
      query = query.limit(100)
    }
    const { data, error } = await query
    
    if (error) throw error
    return (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      link: row.link,
      relatedId: row.related_id,
      isRead: row.is_read,
      createdAt: new Date(row.created_at),
      readAt: row.read_at ? new Date(row.read_at) : undefined,
      requiresAction: row.requires_action || false,
      actionType: row.action_type,
      actionCompletedAt: row.action_completed_at ? new Date(row.action_completed_at) : undefined,
    }))
  },

  async getUnreadNotificationCount(_userId: string): Promise<number> {
    const supabase = await getSupabase()
    // Count current user's notifications that are either:
    // 1. Not read (is_read = false), OR
    // 2. Require action and action not completed yet
    const { data: authData } = await supabase.auth.getUser()
    const currentUid = authData?.user?.id
    // Also try mapped application user id for public.users-based FK
    let mappedAppUserId: string | undefined
    if (currentUid) {
      try {
        const { data: appUser } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', currentUid)
          .maybeSingle()
        mappedAppUserId = appUser?.id
      } catch {}
    }
    const query = supabase
      .from('notifications')
      .select('id, is_read, requires_action, action_completed_at')
      .or('is_read.eq.false,and(requires_action.eq.true,action_completed_at.is.null)')
    const { data, error } = currentUid
      ? await query.in('user_id', [currentUid, mappedAppUserId].filter(Boolean) as string[])
      : await query
    
    if (error) throw error
    return data?.length || 0
  },

  async markNotificationAsRead(notificationId: string): Promise<void> {
    const supabase = await getSupabase()
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId)
    
    if (error) throw error
  },

  async markAllNotificationsAsRead(_userId: string): Promise<void> {
    const supabase = await getSupabase()
    // Restrict updates to current auth user's notifications to avoid admin-wide updates
    const { data: authData } = await supabase.auth.getUser()
    const currentUid = authData?.user?.id
    // Try mapped application user id as well
    let mappedAppUserId: string | undefined
    if (currentUid) {
      try {
        const { data: appUser } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', currentUid)
          .maybeSingle()
        mappedAppUserId = appUser?.id
      } catch {}
    }
    const query = supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('is_read', false)
    const { error } = currentUid
      ? await query.in('user_id', [currentUid, mappedAppUserId].filter(Boolean) as string[])
      : await query
    
    if (error) throw error
  },

  async deleteNotification(notificationId: string): Promise<void> {
    const supabase = await getSupabase()
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
    
    if (error) throw error
  },

  async createNotification(notification: {
    userId: string
    type: string
    title: string
    message: string
    link?: string
    relatedId?: string
    requiresAction?: boolean
    actionType?: string
  }): Promise<void> {
    logger.debug('Creating notification', {
      context: 'SupabaseAPI',
      data: {
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
      }
    })
    
    const supabase = await getSupabase()
    // Ensure we use auth user's UUID for notifications.user_id
    let targetAuthUserId: string = notification.userId
    try {
      const { data: appUser } = await supabase
        .from('users')
        .select('id, auth_user_id')
        .eq('id', notification.userId)
        .maybeSingle()
      if (appUser && (appUser as any).auth_user_id) {
        targetAuthUserId = (appUser as any).auth_user_id as string
      }
    } catch {}

    // First try inserting with auth user id (preferred)
    let insert = await supabase
      .from('notifications')
      .insert({
        user_id: targetAuthUserId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        related_id: notification.relatedId,
        requires_action: notification.requiresAction || false,
        action_type: notification.actionType,
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select()

    if (insert.error && insert.error.code === '23503') {
      // Foreign key references public.users in this environment; retry with app user id
      logger.warn('FK violation on auth user id; retrying with app user id', { context: 'SupabaseAPI' })
      insert = await supabase
        .from('notifications')
        .insert({
          user_id: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          link: notification.link,
          related_id: notification.relatedId,
          requires_action: notification.requiresAction || false,
          action_type: notification.actionType,
          is_read: false,
          created_at: new Date().toISOString(),
        })
        .select()
    }

    if (insert.error) {
      if ((insert.error as any).code === '23505') {
        logger.debug('Duplicate notification ignored', {
          context: 'SupabaseAPI',
          data: {
            userId: notification.userId,
            relatedId: notification.relatedId,
            type: notification.type,
          }
        })
        return
      }
      logger.error('Failed to create notification', insert.error, { context: 'SupabaseAPI' })
      throw insert.error
    }
    
    logger.debug('Notification created successfully', { context: 'SupabaseAPI', data: insert.data })
  },

  async completeNotificationAction(relatedId: string, actionType: string): Promise<void> {
    const supabase = await getSupabase()
    const { error } = await supabase
      .from('notifications')
      .update({ 
        action_completed_at: new Date().toISOString(),
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('related_id', relatedId)
      .eq('action_type', actionType)
      .is('action_completed_at', null)
    
    if (error) throw error
  },

  // ============================================================================
  // ONBOARDING & INVITATIONS
  // ============================================================================

  async createOrganizationForAdmin(params: { 
    name: string
    userId: string
    email: string
  }): Promise<Organization> {
    const supabase = await getSupabase()
    
    // Create organization
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: params.name,
        owner_id: params.userId,
        onboarding_completed: false,
        onboarding_step: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single()
    
    if (orgError) throw orgError
    
    // Update user to be admin of this org
    const { error: userError } = await supabase
      .from('users')
      .update({
        org_id: orgData.id,
        role: 'ADMIN',
        updated_at: new Date().toISOString()
      })
      .eq('id', params.userId)
    
    if (userError) throw userError
    
    // Create onboarding progress
    const { error: onboardingError } = await supabase
      .from('user_onboarding_progress')
      .insert({
        user_id: params.userId,
        org_id: orgData.id,
        onboarding_type: 'admin_create_org',
        current_step: 1,
        total_steps: 4,
        completed: false,
        data: { orgName: params.name },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    
    if (onboardingError) throw onboardingError
    
    return mapOrganization(orgData)
  },

  async updateOnboardingProgress(params: {
    userId: string
    step: number
    data?: Record<string, any>
    completed?: boolean
  }): Promise<void> {
    const supabase = await getSupabase()
    
    const updateData: any = {
      current_step: params.step,
      updated_at: new Date().toISOString()
    }
    
    if (params.data) {
      updateData.data = params.data
    }
    
    if (params.completed) {
      updateData.completed = true
      updateData.completed_at = new Date().toISOString()
    }
    
    const { error } = await supabase
      .from('user_onboarding_progress')
      .update(updateData)
      .eq('user_id', params.userId)
    
    if (error) throw error
  },

  async getOnboardingProgress(userId: string): Promise<OnboardingProgress | null> {
    const supabase = await getSupabase()
    
    const { data, error } = await supabase
      .from('user_onboarding_progress')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    
    if (error) throw error
    if (!data) return null
    
    return {
      userId: data.user_id,
      orgId: data.org_id || undefined,
      onboardingType: data.onboarding_type as 'admin_create_org' | 'invited_user',
      currentStep: data.current_step,
      totalSteps: data.total_steps,
      completed: data.completed,
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      data: data.data || {},
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  },

  async createInvitation(params: {
    orgId: string
    email: string
    role: string
    invitedBy: string
  }): Promise<UserInvitation> {
    const supabase = await getSupabase()
    
    // Generate invitation token
    const { data: tokenData, error: tokenError } = await supabase
      .rpc('generate_invitation_token')
    
    if (tokenError) throw tokenError
    
    const token = tokenData as string
    
    // Create invitation
    const { data, error } = await supabase
      .from('user_invitations')
      .insert({
        org_id: params.orgId,
        email: params.email.toLowerCase(),
        role: params.role,
        invited_by: params.invitedBy,
        invitation_token: token,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single()
    
    if (error) throw error
    
    return {
      id: data.id,
      orgId: data.org_id,
      email: data.email,
      role: data.role,
      invitedBy: data.invited_by || undefined,
      invitationToken: data.invitation_token,
      expiresAt: new Date(data.expires_at),
      acceptedAt: data.accepted_at ? new Date(data.accepted_at) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  },

  async getInvitationByToken(token: string): Promise<UserInvitation | null> {
    const supabase = await getSupabase()
    
    const { data, error } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('invitation_token', token)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()
    
    if (error) throw error
    if (!data) return null
    
    return {
      id: data.id,
      orgId: data.org_id,
      email: data.email,
      role: data.role,
      invitedBy: data.invited_by || undefined,
      invitationToken: data.invitation_token,
      expiresAt: new Date(data.expires_at),
      acceptedAt: data.accepted_at ? new Date(data.accepted_at) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  },

  async acceptInvitation(params: {
    token: string
    userId: string
  }): Promise<{ success: boolean; invitation?: UserInvitation }> {
    const supabase = await getSupabase()
    
    // Use the database function to accept invitation
    const { data, error } = await supabase
      .rpc('accept_invitation', {
        token: params.token,
        user_uuid: params.userId
      })
    
    if (error) throw error
    if (!data) return { success: false }
    
    // Fetch the accepted invitation
    const { data: invData, error: invError } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('invitation_token', params.token)
      .single()
    
    if (invError) throw invError
    
    return {
      success: true,
      invitation: {
        id: invData.id,
        orgId: invData.org_id,
        email: invData.email,
        role: invData.role,
        invitedBy: invData.invited_by || undefined,
        invitationToken: invData.invitation_token,
        expiresAt: new Date(invData.expires_at),
        acceptedAt: invData.accepted_at ? new Date(invData.accepted_at) : undefined,
        createdAt: new Date(invData.created_at),
        updatedAt: new Date(invData.updated_at)
      }
    }
  },

  async getPendingInvitations(orgId: string): Promise<UserInvitation[]> {
    const supabase = await getSupabase()
    
    const { data, error } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('org_id', orgId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return (data || []).map((inv: any) => ({
      id: inv.id,
      orgId: inv.org_id,
      email: inv.email,
      role: inv.role,
      invitedBy: inv.invited_by || undefined,
      invitationToken: inv.invitation_token,
      expiresAt: new Date(inv.expires_at),
      acceptedAt: inv.accepted_at ? new Date(inv.accepted_at) : undefined,
      createdAt: new Date(inv.created_at),
      updatedAt: new Date(inv.updated_at)
    }))
  },

  async deleteInvitation(invitationId: string): Promise<void> {
    const supabase = await getSupabase()
    
    const { error } = await supabase
      .from('user_invitations')
      .delete()
      .eq('id', invitationId)
    
    if (error) throw error
  },

}
