import { Audit, AuditStatus, AuditorAssignment, Branch, Organization, User, UserRole, Zone, Survey } from '@trakr/shared'
import type { Tables, Enums } from '@trakr/shared'
import { getSupabase } from './supabaseClient'

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
  async updateBranch(id: string, updates: Partial<Pick<Branch, 'name' | 'address' | 'managerId'>>): Promise<Branch> {
    const supabase = await getSupabase()
    const base: any = { updated_at: new Date().toISOString() }
    if (updates.name != null) base.name = updates.name
    if (updates.address != null) base.address = updates.address
    if (updates.managerId !== undefined) base.manager_id = updates.managerId
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
    // Load survey (version, frequency) and org
    const [{ data: s, error: sErr }, { data: org, error: oErr }] = await Promise.all([
      supabase.from('surveys').select('id, version, frequency, org_id').eq('id', payload.surveyId).maybeSingle(),
      supabase.from('organizations').select('*').eq('id', payload.orgId).maybeSingle(),
    ])
    if (sErr) throw sErr
    if (oErr) throw oErr
    if (!s) throw new Error('Survey not found')
    if (!org) throw new Error('Organization not found')
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
  async getSurveyById(id: string) {
    const supabase = await getSupabase()
    const { data: s, error } = await supabase.from('surveys').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    if (!s) return null
    const { data: sections, error: e2 } = await supabase.from('survey_sections').select('*').eq('survey_id', id).order('order_num', { ascending: true })
    if (e2) throw e2
    const sectionIds = (sections || []).map((sec: Tables<'survey_sections'>) => sec.id)
    let questions: Tables<'survey_questions'>[] = []
    if (sectionIds.length) {
      const { data: qs, error: e3 } = await supabase.from('survey_questions').select('*').in('section_id', sectionIds).order('order_num', { ascending: true })
      if (e3) throw e3
      questions = qs || []
    }
    const bySection: Record<string, any[]> = {}
    questions.forEach((q) => {
      const arr = bySection[q.section_id] || (bySection[q.section_id] = [])
      arr.push({
        id: q.id,
        text: q.question_text,
        type: (q.question_type?.toLowerCase() || 'yes_no') as any,
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
        .order('order_num', { ascending: true })
      if (secError) throw secError
      
      // Load questions
      const { data: questions, error: qError } = await supabase
        .from('survey_questions')
        .select('*')
        .eq('survey_id', s.id)
        .order('order_num', { ascending: true })
      if (qError) throw qError
      
      // Group questions by section
      const bySection: Record<string, any[]> = {}
      ;(questions || []).forEach((q: Tables<'survey_questions'>) => {
        const arr = bySection[q.section_id] || (bySection[q.section_id] = [])
        arr.push({
          id: q.id,
          text: q.question_text,
          type: (q.question_type?.toLowerCase() || 'yes_no') as any,
          required: q.required,
          order: q.order_num,
          isWeighted: q.is_weighted,
          yesWeight: q.yes_weight ?? undefined,
          noWeight: q.no_weight ?? undefined,
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
      }
    }))
    
    return surveys
  },

  // Activity logs
  async getActivityLogs(entityId?: string, orgId?: string) {
    const supabase = await getSupabase()
    let q = supabase.from('activity_logs').select('*')
    
    // Filter by entity if provided
    if (entityId) q = q.eq('entity_id', entityId)
    
    // Filter by org if provided (for multi-tenant isolation)
    if (orgId) q = q.eq('org_id', orgId)
    
    const { data, error } = await q.order('created_at', { ascending: false }).limit(50)
    if (error) throw error
    return (data || []).map((r: Tables<'activity_logs'>) => ({
      id: r.id,
      userId: r.user_id || '',
      action: r.action,
      details: r.details || '',
      entityType: r.entity_type || '',
      entityId: r.entity_id || '',
      timestamp: new Date(r.created_at),
    }))
  },

  async createActivityLog(userId: string, action: string, details: string, entityType: string, entityId: string) {
    const supabase = await getSupabase()
    const { error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        action,
        details,
        entity_type: entityType,
        entity_id: entityId,
      } as any)
    if (error) console.error('Failed to create activity log:', error)
  },

  // Zones CRUD
  async createZone(payload: { orgId: string; name: string; description?: string; branchIds: string[] }): Promise<Zone> {
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
      const { error: dErr } = await supabase.from('zone_branches').delete().eq('zone_id', id)
      if (dErr) throw dErr
      if (updates.branchIds.length) {
        const rows = updates.branchIds.map(bid => ({ zone_id: id, branch_id: bid }))
        const { error: iErr } = await supabase.from('zone_branches').insert(rows as any)
        if (iErr) throw iErr
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
  async createSurvey(payload: { title: string; description: string; sections: any[]; createdBy: string }): Promise<Partial<Survey> & { id: string }> {
    const supabase = await getSupabase()
    // Resolve org from user; fall back to first organization if user not found (dev convenience)
    let orgId: string | null = null
    const { data: user, error: uErr } = await supabase.from('users').select('*').eq('id', payload.createdBy).maybeSingle()
    if (uErr) throw uErr
    if (user) orgId = (user as Tables<'users'>).org_id
    if (!orgId) {
      const { data: org, error: oErr } = await supabase.from('organizations').select('id').order('created_at', { ascending: true }).limit(1).maybeSingle()
      if (oErr) throw oErr
      orgId = (org as any)?.id || null
    }
    if (!orgId) throw new Error('No organization available for survey creation')
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
        }))
        if (qRows.length) {
          const { error: qErr } = await supabase.from('survey_questions').insert(qRows as any)
          if (qErr) throw qErr
        }
      }
    }
    return { id: surveyId }
  },
  async duplicateSurvey(id: string, _userId: string): Promise<void> {
    const supabase = await getSupabase()
    const { data: s, error } = await supabase.from('surveys').select('*').eq('id', id).single()
    if (error || !s) throw error || new Error('Survey not found')
    const { data: sections, error: e2 } = await supabase.from('survey_sections').select('*').eq('survey_id', id).order('order_num', { ascending: true })
    if (e2) throw e2
    const secIds = (sections || []).map((sec: Tables<'survey_sections'>) => sec.id)
    let questions: Tables<'survey_questions'>[] = []
    if (secIds.length) {
      const { data: qs, error: e3 } = await supabase.from('survey_questions').select('*').in('section_id', secIds).order('order_num', { ascending: true })
      if (e3) throw e3
      questions = qs || []
    }
    const now = new Date().toISOString()
    const { data: ns, error: nErr } = await supabase.from('surveys').insert({
      org_id: (s as Tables<'surveys'>).org_id,
      title: `Copy of ${(s as Tables<'surveys'>).title}`,
      description: (s as Tables<'surveys'>).description || null,
      is_active: (s as Tables<'surveys'>).is_active,
      version: (s as Tables<'surveys'>).version,
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
    }))
    if (qRows.length) {
      const { error: qInsErr } = await supabase.from('survey_questions').insert(qRows as any)
      if (qInsErr) throw qInsErr
    }
  },
  async updateSurvey(id: string, updates: Partial<{ title: string; description: string; isActive: boolean; sections: any[]; frequency: any }>): Promise<void> {
    const supabase = await getSupabase()
    const now = new Date().toISOString()
    const base: any = { updated_at: now }
    if (updates.title != null) base.title = updates.title
    if (updates.description != null) base.description = updates.description
    if (updates.isActive != null) base.is_active = updates.isActive
    if (updates.frequency != null) base.frequency = String(updates.frequency).toUpperCase()
    if (Object.keys(base).length > 1) {
      const { error } = await supabase.from('surveys').update(base).eq('id', id)
      if (error) throw error
    }
    if (updates.sections) {
      // Replace sections and questions entirely
      await supabase.from('survey_questions').delete().eq('survey_id', id)
      await supabase.from('survey_sections').delete().eq('survey_id', id)
      if (updates.sections.length) {
        const secRows = updates.sections.map((sec, idx) => ({
          survey_id: id,
          title: sec.title || `Page ${idx + 1}`,
          description: sec.description || null,
          order_num: sec.order ?? idx,
        }))
        const { data: insSecs, error: sErr } = await supabase.from('survey_sections').insert(secRows as any).select('*')
        if (sErr) throw sErr
        for (let i = 0; i < updates.sections.length; i++) {
          const srcSec = updates.sections[i]
          const dstSec = (insSecs || [])[i] as Tables<'survey_sections'>
          const qRows = (srcSec.questions || []).map((q: any, qIdx: number) => ({
            survey_id: id,
            section_id: dstSec.id,
            question_text: q.text || '',
            question_type: q.type || 'yes_no',
            required: !!q.required,
            order_num: q.order ?? qIdx,
            is_weighted: !!q.isWeighted,
            yes_weight: q.yesWeight ?? null,
            no_weight: q.noWeight ?? null,
          }))
          if (qRows.length) {
            const { error: qErr } = await supabase.from('survey_questions').insert(qRows as any)
            if (qErr) throw qErr
          }
        }
      }
    }
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
    async updateUser(id: string, updates: Partial<{ name: string; email: string; role: UserRole; isActive: boolean }>) {
    const supabase = await getSupabase()

    // If email is being changed, update it in auth.users as well
    if (updates.email) {
      const { error: authError } = await supabase.auth.updateUser({ email: updates.email })
      if (authError) {
        console.error('Failed to update auth user email:', authError)
        // Do not proceed with DB update if auth update fails
        throw authError
      }
    }
    const base: any = { updated_at: new Date().toISOString() }
    if (updates.name != null) base.full_name = updates.name
    if (updates.email != null) base.email = updates.email
    if (updates.role != null) base.role = updates.role.toUpperCase()
    if (updates.isActive != null) base.is_active = updates.isActive
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

    if (error) console.error('Failed to delete logo:', error)
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
    console.log(`Resend invitation: ${user.email}`)
    
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
  async getNotifications(userId: string) {
    const supabase = await getSupabase()
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    
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

  async getAllNotifications() {
    const supabase = await getSupabase()
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100) // Admins can see more
    
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

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const supabase = await getSupabase()
    // Count notifications that are either:
    // 1. Not read (is_read = false), OR
    // 2. Require action and action not completed yet
    const { data, error } = await supabase
      .from('notifications')
      .select('id, is_read, requires_action, action_completed_at')
      .eq('user_id', userId)
      .or('is_read.eq.false,and(requires_action.eq.true,action_completed_at.is.null)')
    
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

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    const supabase = await getSupabase()
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false)
    
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
    console.log('📤 [Supabase] Creating notification:', {
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      requiresAction: notification.requiresAction
    })
    
    const supabase = await getSupabase()
    const { data, error } = await supabase
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
    
    if (error) {
      console.error('❌ [Supabase] Failed to create notification:', error)
      throw error
    }
    
    console.log('✅ [Supabase] Notification created successfully:', data)
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

}
