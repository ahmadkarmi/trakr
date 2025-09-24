import { User, UserRole, Audit, AuditStatus, Survey, Organization, Branch, Zone, LogEntry, QuestionType, AuditPhoto, AuditorAssignment, AuditFrequency } from '../types';

// Mock Organizations
export const mockOrganizations: Organization[] = [
  {
    id: 'org-1',
    name: 'Acme Corporation',
    description: 'Leading retail chain with multiple branches',
    timeZone: 'UTC',
    weekStartsOn: 1,
    gatingPolicy: 'completed_approved',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// Mock Zones
export const mockZones: Zone[] = [
  {
    id: 'zone-1',
    orgId: 'org-1',
    name: 'North Region',
    description: 'Northern locations',
    branchIds: ['branch-1'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// Mock Auditor Assignments
export const mockAuditorAssignments: AuditorAssignment[] = [
  {
    userId: 'user-1',
    branchIds: ['branch-1'],
    zoneIds: [],
  },
  {
    userId: 'user-10',
    branchIds: ['branch-2'],
    zoneIds: [],
  },
  {
    userId: 'user-11',
    branchIds: [],
    zoneIds: [],
  },
];

// Mock Branches
export const mockBranches: Branch[] = [
  {
    id: 'branch-1',
    name: 'Downtown Store',
    address: '123 Main St, Downtown',
    orgId: 'org-1',
    managerId: 'user-2',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'branch-2',
    name: 'Mall Location',
    address: '456 Shopping Center Blvd',
    orgId: 'org-1',
    managerId: 'user-2',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// Mock Users
export const mockUsers: User[] = [
  {
    id: 'user-1',
    name: 'John Auditor',
    email: 'auditor@trakr.com',
    role: UserRole.AUDITOR,
    orgId: 'org-1',
    branchId: 'branch-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'user-10',
    name: 'Alice Auditor',
    email: 'alice@trakr.com',
    role: UserRole.AUDITOR,
    orgId: 'org-1',
    branchId: 'branch-2',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'user-11',
    name: 'Bob Auditor',
    email: 'bob@trakr.com',
    role: UserRole.AUDITOR,
    orgId: 'org-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'user-2',
    name: 'Jane Manager',
    email: 'manager@trakr.com',
    role: UserRole.BRANCH_MANAGER,
    orgId: 'org-1',
    branchId: 'branch-1',
    signatureUrl: undefined,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'user-3',
    name: 'Admin User',
    email: 'admin@trakr.com',
    role: UserRole.ADMIN,
    orgId: 'org-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// Mock Survey Templates
export const mockSurveys: Survey[] = [
  {
    id: 'survey-1',
    title: 'Store Safety Audit',
    description: 'Comprehensive safety audit for retail locations',
    version: 1,
    frequency: AuditFrequency.WEEKLY,
    sections: [
      {
        id: 'section-1',
        title: 'Fire Safety',
        description: 'Fire safety equipment and procedures',
        order: 1,
        questions: [
          {
            id: 'q1',
            text: 'Are fire extinguishers properly mounted and accessible?',
            type: QuestionType.YES_NO,
            required: true,
            order: 1,
            isWeighted: true,
            yesWeight: 5,
            noWeight: 0,
          },
          {
            id: 'q2',
            text: 'Are emergency exits clearly marked and unobstructed?',
            type: QuestionType.YES_NO,
            required: true,
            order: 2,
            isWeighted: true,
            yesWeight: 5,
            noWeight: 0,
          },
        ],
      },
      {
        id: 'section-2',
        title: 'Customer Safety',
        description: 'Customer safety measures and protocols',
        order: 2,
        questions: [
          {
            id: 'q3',
            text: 'Are walkways clear of obstacles and spills?',
            type: QuestionType.YES_NO,
            required: true,
            order: 1,
            isWeighted: true,
            yesWeight: 5,
            noWeight: 0,
          },
          {
            id: 'q4',
            text: 'Is adequate lighting provided throughout the store?',
            type: QuestionType.YES_NO,
            required: true,
            order: 2,
            isWeighted: true,
            yesWeight: 5,
            noWeight: 0,
          },
        ],
      },
    ],
    createdBy: 'user-3',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    isActive: true,
  },
];

// Mock Audits
export const mockAudits: Audit[] = [
  {
    id: 'audit-1',
    orgId: 'org-1',
    branchId: 'branch-1',
    surveyId: 'survey-1',
    surveyVersion: 1,
    assignedTo: 'user-1',
    status: AuditStatus.IN_PROGRESS,
    responses: {
      'q1': 'yes',
      'q2': 'yes',
    },
    naReasons: {},
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-16'),
  },
  {
    id: 'audit-2',
    orgId: 'org-1',
    branchId: 'branch-1',
    surveyId: 'survey-1',
    surveyVersion: 1,
    assignedTo: 'user-1',
    status: AuditStatus.COMPLETED,
    responses: {
      'q1': 'yes',
      'q2': 'no',
      'q3': 'yes',
      'q4': 'yes',
    },
    naReasons: {},
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-12'),
  },
];

// Mock Activity Logs
export const mockActivityLogs: LogEntry[] = [
  {
    id: 'log-1',
    userId: 'user-1',
    action: 'audit_started',
    details: 'Started Store Safety Audit for Downtown Store',
    entityType: 'audit',
    entityId: 'audit-1',
    timestamp: new Date('2024-01-15T10:00:00Z'),
  },
  {
    id: 'log-2',
    userId: 'user-1',
    action: 'audit_completed',
    details: 'Completed Store Safety Audit for Downtown Store',
    entityType: 'audit',
    entityId: 'audit-2',
    timestamp: new Date('2024-01-12T15:30:00Z'),
  },
];

// Helper: append activity log
function addLog(
  userId: string,
  action: string,
  details: string,
  entityType: 'audit' | 'survey' | 'user' | 'branch' | 'organization',
  entityId: string
) {
  mockActivityLogs.unshift({
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId,
    action,
    details,
    entityType,
    entityId,
    timestamp: new Date(),
  });
}

// Scheduling helpers
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}
function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}
function startOfWeekGeneric(d: Date, weekStartsOn: 0 | 1 = 1): Date {
  const day = d.getDay() // 0=Sun..6=Sat
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
function getOrgLocalNow(org: Organization, now: Date): Date {
  try {
    return new Date(now.toLocaleString('en-US', { timeZone: org.timeZone || 'UTC' }))
  } catch {
    return new Date(now) // fallback
  }
}
function adjustToUTCFromOrgLocal(orgLocal: Date, orgLocalNow: Date, now: Date): Date {
  // map org-local timestamp to UTC by preserving the delta to the real now
  const delta = orgLocalNow.getTime() - now.getTime()
  return new Date(orgLocal.getTime() - delta)
}
function getPeriodRangeForOrg(freq: AuditFrequency, now: Date, org: Organization): { start: Date; end: Date } {
  const orgNow = getOrgLocalNow(org, now)
  let localStart: Date
  let localEnd: Date
  switch (freq) {
    case AuditFrequency.DAILY:
      localStart = startOfDay(orgNow)
      localEnd = endOfDay(orgNow)
      break
    case AuditFrequency.WEEKLY: {
      const w = (org.weekStartsOn ?? 1) as 0 | 1
      localStart = startOfWeekGeneric(orgNow, w)
      localEnd = endOfWeekGeneric(orgNow, w)
      break
    }
    case AuditFrequency.MONTHLY:
      localStart = startOfMonth(orgNow)
      localEnd = endOfMonth(orgNow)
      break
    case AuditFrequency.QUARTERLY:
      localStart = startOfQuarter(orgNow)
      localEnd = endOfQuarter(orgNow)
      break
    default:
      // Default to weekly when unspecified
      const w = (org.weekStartsOn ?? 1) as 0 | 1
      localStart = startOfWeekGeneric(orgNow, w)
      localEnd = endOfWeekGeneric(orgNow, w)
  }
  return { start: adjustToUTCFromOrgLocal(localStart, orgNow, now), end: adjustToUTCFromOrgLocal(localEnd, orgNow, now) }
}

// effectiveAssigneesForBranch and stablePick helpers were used by legacy scheduling logic.
// They are intentionally removed as audits are scheduled as unassigned at period start now.

// Track last period start per org so manual branch assignments apply only to the current cycle
const lastPeriodStartByOrg: Record<string, string | undefined> = {}

function ensureScheduledForCurrentPeriod(now: Date) {
  // For each active survey with frequency
  // New behavior: schedule audits for ALL branches at period start and leave them UNASSIGNED.
  // Admins can then assign via zones or manual distribution later.
  mockSurveys.forEach((s) => {
    const freq = s.frequency || AuditFrequency.WEEKLY
    if (!s.isActive) return
    mockBranches.forEach((b) => {
      const org = mockOrganizations.find(o => o.id === b.orgId) || mockOrganizations[0]
      const { start, end } = getPeriodRangeForOrg(freq, now, org)
      const startIso = start.toISOString()
      // If we detect a new period for this org, clear manual branch assignments for this org
      const prevStartIso = lastPeriodStartByOrg[org.id]
      if (prevStartIso && prevStartIso !== startIso) {
        mockAuditorAssignments.forEach(a => {
          const u = mockUsers.find(u => u.id === a.userId)
          if (u?.orgId === org.id) {
            a.branchIds = []
          }
        })
      }
      if (!prevStartIso) {
        lastPeriodStartByOrg[org.id] = startIso
      } else if (prevStartIso !== startIso) {
        lastPeriodStartByOrg[org.id] = startIso
      }

      const exists = mockAudits.some(a => a.branchId === b.id && a.surveyId === s.id && a.periodStart && new Date(a.periodStart).getTime() === start.getTime())
      if (!exists) {
        const newAudit: Audit = {
          id: `audit-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          orgId: b.orgId,
          branchId: b.id,
          surveyId: s.id,
          surveyVersion: s.version,
          assignedTo: '', // unassigned at cycle start
          status: AuditStatus.DRAFT,
          responses: {},
          naReasons: {},
          createdAt: now,
          updatedAt: now,
          periodStart: start,
          periodEnd: end,
          dueAt: end,
          isArchived: false,
        }
        mockAudits.unshift(newAudit)
        addLog('system', 'audit_scheduled_unassigned', `Scheduled ${s.title} for ${b.name} (unassigned)`, 'audit', newAudit.id)
      }
    })
  })
}

function autoArchiveDue(now: Date) {
  mockAudits.forEach((a, idx) => {
    if (a.isArchived) return
    if (a.dueAt && new Date(a.dueAt).getTime() <= now.getTime()) {
      const next: Audit = { ...a, isArchived: true, archivedAt: a.dueAt, updatedAt: now }
      mockAudits[idx] = next
      addLog(a.assignedTo, 'audit_archived_auto', `Archived due audit ${a.id}`, 'audit', a.id)
    }
  })
}

function synchronizeScheduling(now: Date = new Date()) {
  autoArchiveDue(now)
  ensureScheduledForCurrentPeriod(now)
}

// Mock API functions
export const mockApi = {
  // Users
  getUsers: async (): Promise<User[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockUsers;
  },

  getUserById: async (id: string): Promise<User | null> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockUsers.find(user => user.id === id) || null;
  },

  setUserSignature: async (id: string, signatureUrl: string | null): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const idx = mockUsers.findIndex(u => u.id === id)
    if (idx === -1) throw new Error(`User not found: ${id}`)
    const current = mockUsers[idx]
    const next: User = { ...current, signatureUrl: signatureUrl || undefined, updatedAt: new Date() }
    mockUsers[idx] = next
    addLog(id, signatureUrl ? 'signature_set' : 'signature_cleared', signatureUrl ? 'Updated signature image' : 'Cleared signature image', 'user', id)
    return next
  },

  deleteAudit: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 60));
    const idx = mockAudits.findIndex(a => a.id === id)
    if (idx !== -1) {
      mockAudits.splice(idx, 1)
      addLog('user-3', 'audit_deleted', `Deleted audit ${id}`, 'audit', id)
    }
  },

  setUserAvatar: async (id: string, avatarUrl: string | null): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const idx = mockUsers.findIndex(u => u.id === id)
    if (idx === -1) throw new Error(`User not found: ${id}`)
    const current = mockUsers[idx]
    const next: User = { ...current, avatarUrl: avatarUrl || undefined, updatedAt: new Date() }
    mockUsers[idx] = next
    addLog(id, avatarUrl ? 'avatar_set' : 'avatar_cleared', avatarUrl ? 'Updated profile image' : 'Cleared profile image', 'user', id)
    return next
  },

  updateUser: async (id: string, updates: Partial<Pick<User, 'name' | 'email'>>): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const idx = mockUsers.findIndex(u => u.id === id)
    if (idx === -1) throw new Error(`User not found: ${id}`)
    const current = mockUsers[idx]
    const next: User = { ...current, ...updates, updatedAt: new Date() }
    mockUsers[idx] = next
    addLog(id, 'user_updated', `Updated profile ${(updates.name ? 'name ' : '')}${(updates.email ? 'email' : '')}`.trim(), 'user', id)
    return next
  },

  // Audits
  getAudits: async (filters?: { assignedTo?: string; status?: AuditStatus; branchId?: string; orgId?: string; updatedAfter?: Date; updatedBefore?: Date }): Promise<Audit[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    // synchronize auto-archive and scheduling before returning
    synchronizeScheduling(new Date())
    let filteredAudits = [...mockAudits];
    
    if (filters?.assignedTo) {
      filteredAudits = filteredAudits.filter(audit => audit.assignedTo === filters.assignedTo);
    }
    
    if (filters?.status) {
      filteredAudits = filteredAudits.filter(audit => audit.status === filters.status);
    }
    if (filters?.branchId) {
      filteredAudits = filteredAudits.filter(audit => audit.branchId === filters.branchId);
    }
    if (filters?.orgId) {
      filteredAudits = filteredAudits.filter(audit => audit.orgId === filters.orgId);
    }
    if (filters?.updatedAfter) {
      const after = filters.updatedAfter.getTime();
      filteredAudits = filteredAudits.filter(audit => new Date(audit.updatedAt).getTime() >= after);
    }
    if (filters?.updatedBefore) {
      const before = filters.updatedBefore.getTime();
      filteredAudits = filteredAudits.filter(audit => new Date(audit.updatedAt).getTime() <= before);
    }
    
    return filteredAudits;
  },

  getAuditById: async (id: string): Promise<Audit | null> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockAudits.find(audit => audit.id === id) || null;
  },

  // Surveys
  getSurveys: async (): Promise<Survey[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockSurveys;
  },

  getSurveyById: async (id: string): Promise<Survey | null> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockSurveys.find(survey => survey.id === id) || null;
  },

  // Organizations
  getOrganizations: async (): Promise<Organization[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockOrganizations;
  },

  updateOrganization: async (id: string, updates: Partial<Pick<Organization, 'name' | 'description' | 'timeZone' | 'weekStartsOn' | 'gatingPolicy'>>): Promise<Organization> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const idx = mockOrganizations.findIndex(o => o.id === id)
    if (idx === -1) throw new Error(`Organization not found: ${id}`)
    const current = mockOrganizations[idx]
    const next: Organization = { ...current, ...updates, updatedAt: new Date() }
    mockOrganizations[idx] = next
    addLog('system', 'org_updated', `Updated organization ${id}`, 'organization', id)
    return next
  },

  // Branches
  getBranches: async (orgId?: string): Promise<Branch[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return orgId 
      ? mockBranches.filter(branch => branch.orgId === orgId)
      : mockBranches;
  },

  // Zones
  getZones: async (orgId?: string): Promise<Zone[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return orgId ? mockZones.filter(z => z.orgId === orgId) : mockZones
  },

  createZone: async (payload: Pick<Zone, 'orgId' | 'name' | 'description' | 'branchIds'>): Promise<Zone> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const now = new Date()
    const zone: Zone = { id: `zone-${Date.now()}`, orgId: payload.orgId, name: payload.name, description: payload.description, branchIds: payload.branchIds || [], createdAt: now, updatedAt: now }
    mockZones.unshift(zone)
    addLog('system', 'zone_created', `Created zone ${zone.name}`, 'organization', zone.id)
    return zone
  },

  updateZone: async (id: string, updates: Partial<Pick<Zone, 'name' | 'description' | 'branchIds'>>): Promise<Zone> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const idx = mockZones.findIndex(z => z.id === id)
    if (idx === -1) throw new Error(`Zone not found: ${id}`)
    const current = mockZones[idx]
    const next: Zone = { ...current, ...updates, updatedAt: new Date() }
    mockZones[idx] = next
    addLog('system', 'zone_updated', `Updated zone ${id}`, 'organization', id)
    return next
  },

  deleteZone: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 150));
    const idx = mockZones.findIndex(z => z.id === id)
    if (idx !== -1) {
      const z = mockZones.splice(idx, 1)[0]
      addLog('system', 'zone_deleted', `Deleted zone ${z.name}`, 'organization', id)
    }
  },

  // Branch CRUD + settings
  createBranch: async (payload: Pick<Branch, 'orgId' | 'name' | 'address' | 'managerId'>): Promise<Branch> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const now = new Date()
    const branch: Branch = { id: `branch-${Date.now()}`, orgId: payload.orgId, name: payload.name, address: payload.address, managerId: payload.managerId, createdAt: now, updatedAt: now }
    mockBranches.unshift(branch)
    addLog('system', 'branch_created', `Created branch ${branch.name}`, 'branch', branch.id)
    return branch
  },

  updateBranch: async (id: string, updates: Partial<Pick<Branch, 'name' | 'address' | 'managerId'>>): Promise<Branch> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const idx = mockBranches.findIndex(b => b.id === id)
    if (idx === -1) throw new Error(`Branch not found: ${id}`)
    const current = mockBranches[idx]
    const next: Branch = { ...current, ...updates, updatedAt: new Date() }
    mockBranches[idx] = next
    addLog('system', 'branch_updated', `Updated branch ${id}`, 'branch', id)
    return next
  },

  deleteBranch: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 150));
    const idx = mockBranches.findIndex(b => b.id === id)
    if (idx !== -1) {
      const b = mockBranches.splice(idx, 1)[0]
      // Remove from zones
      mockZones.forEach(z => { z.branchIds = z.branchIds.filter(bid => bid !== id); z.updatedAt = new Date() })
      addLog('system', 'branch_deleted', `Deleted branch ${b.name}`, 'branch', id)
    }
  },

  setBranchManager: async (branchId: string, managerId: string | null): Promise<Branch> => {
    return mockApi.updateBranch(branchId, { managerId: managerId || undefined })
  },

  // Survey frequency is handled at the template level

  // Auditor assignments
  getAuditorAssignments: async (): Promise<AuditorAssignment[]> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockAuditorAssignments
  },

  setAuditorAssignment: async (userId: string, payload: { branchIds: string[]; zoneIds: string[] }): Promise<AuditorAssignment> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const idx = mockAuditorAssignments.findIndex(a => a.userId === userId)
    const next: AuditorAssignment = { userId, branchIds: payload.branchIds || [], zoneIds: payload.zoneIds || [] }
    if (idx === -1) mockAuditorAssignments.push(next)
    else mockAuditorAssignments[idx] = next
    addLog(userId, 'auditor_assigned', `Assigned to ${next.branchIds.length} branches and ${next.zoneIds.length} zones`, 'user', userId)
    return next
  },

  // Activity Logs
  getActivityLogs: async (entityId?: string): Promise<LogEntry[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return entityId
      ? mockActivityLogs.filter(log => log.entityId === entityId)
      : mockActivityLogs;
  },

  // Mutations (in-memory)
  createAudit: async (
    payload: { orgId: string; branchId: string; surveyId: string; assignedTo: string }
  ): Promise<Audit> => {
    await new Promise(resolve => setTimeout(resolve, 150));
    const now = new Date();
    const survey = mockSurveys.find(s => s.id === payload.surveyId);
    const org = mockOrganizations.find(o => o.id === payload.orgId) || mockOrganizations[0]
    const freq = survey?.frequency || AuditFrequency.WEEKLY
    const period = getPeriodRangeForOrg(freq, now, org)
    const newAudit: Audit = {
      id: `audit-${Date.now()}`,
      orgId: payload.orgId,
      branchId: payload.branchId,
      surveyId: payload.surveyId,
      surveyVersion: survey?.version ?? 1,
      assignedTo: payload.assignedTo,
      status: AuditStatus.DRAFT,
      responses: {},
      naReasons: {},
      createdAt: now,
      updatedAt: now,
      periodStart: period.start,
      periodEnd: period.end,
      dueAt: period.end,
      isArchived: false,
    };
    mockAudits.unshift(newAudit);
    addLog(payload.assignedTo, 'audit_created', `Created audit ${newAudit.id} for survey ${payload.surveyId}`, 'audit', newAudit.id);
    return newAudit;
  },
  saveAuditProgress: async (
    auditId: string,
    updates: {
      responses?: Record<string, string>;
      naReasons?: Record<string, string>;
      sectionComments?: Record<string, string>;
    }
  ): Promise<Audit> => {
    await new Promise(resolve => setTimeout(resolve, 150));
    const idx = mockAudits.findIndex(a => a.id === auditId);
    if (idx === -1) throw new Error(`Audit not found: ${auditId}`);
    const current = mockAudits[idx];
    // Block edits when awaiting approval or already approved
    if (current.status === AuditStatus.SUBMITTED || current.status === AuditStatus.APPROVED) {
      return current;
    }
    // Reopen rejected audits to IN_PROGRESS on save; draft moves to IN_PROGRESS on first save
    const nextStatus = (current.status === AuditStatus.DRAFT || current.status === AuditStatus.REJECTED)
      ? AuditStatus.IN_PROGRESS
      : current.status
    const next: Audit = {
      ...current,
      responses: { ...current.responses, ...(updates.responses || {}) },
      naReasons: { ...current.naReasons, ...(updates.naReasons || {}) },
      sectionComments: { ...(current.sectionComments || {}), ...(updates.sectionComments || {}) },
      status: nextStatus,
      updatedAt: new Date(),
    };
    mockAudits[idx] = next;
    addLog(next.assignedTo, 'audit_saved', `Saved progress for audit ${auditId}`, 'audit', auditId);
    return next;
  },

  /**
   * Admin override to edit an audit regardless of status.
   * Useful for correcting Approved/Submitted audits while keeping status intact.
   */
  adminEditAudit: async (
    auditId: string,
    updates: { responses?: Record<string, string>; naReasons?: Record<string, string>; sectionComments?: Record<string, string> },
    adminUserId: string,
  ): Promise<Audit> => {
    await new Promise(resolve => setTimeout(resolve, 120));
    const idx = mockAudits.findIndex(a => a.id === auditId);
    if (idx === -1) throw new Error(`Audit not found: ${auditId}`);
    const current = mockAudits[idx];
    // Permission: only admin may perform override edits
    const actor = mockUsers.find(u => u.id === adminUserId)
    if (actor?.role !== UserRole.ADMIN) {
      throw new Error('Permission denied: Only admin can edit approved/submitted audits')
    }
    const next: Audit = {
      ...current,
      responses: { ...current.responses, ...(updates.responses || {}) },
      naReasons: { ...current.naReasons, ...(updates.naReasons || {}) },
      sectionComments: { ...(current.sectionComments || {}), ...(updates.sectionComments || {}) },
      updatedAt: new Date(),
    };
    mockAudits[idx] = next;
    addLog(adminUserId, 'admin_audit_edited', `Admin edited audit ${auditId}`, 'audit', auditId);
    return next;
  },

  /**
   * Reassign all open audits for a branch to a new auditor.
   * Carries progress for DRAFT, IN_PROGRESS, or REJECTED audits by updating assignedTo.
   * Submitted/Approved/Completed are not touched.
   * Returns the number of audits updated.
   */
  reassignOpenAuditsForBranch: async (branchId: string, toUserId: string): Promise<number> => {
    await new Promise(resolve => setTimeout(resolve, 80));
    let updated = 0
    mockAudits.forEach((a, idx) => {
      if (a.branchId !== branchId) return
      if (a.isArchived) return
      if (a.status === AuditStatus.DRAFT || a.status === AuditStatus.IN_PROGRESS || a.status === AuditStatus.REJECTED) {
        const next: Audit = { ...a, assignedTo: toUserId, updatedAt: new Date() }
        mockAudits[idx] = next
        addLog(toUserId, 'audit_reassigned', `Reassigned open audit ${a.id} to new auditor`, 'audit', a.id)
        updated++
      }
    })
    return updated
  },

  /**
   * Batch variant of reassigning open audits for multiple branches.
   * Returns the total number of audits updated.
   */
  reassignOpenAuditsForBranches: async (branchIds: string[], toUserId: string): Promise<number> => {
    let total = 0
    for (const bid of branchIds) {
      total += await mockApi.reassignOpenAuditsForBranch(bid, toUserId)
    }
    return total
  },

  /**
   * Reassign only NOT-STARTED audits (DRAFT) for a branch to a new auditor.
   * Used for zone distribution — does not move IN_PROGRESS or REJECTED audits.
   */
  reassignUnstartedAuditsForBranch: async (branchId: string, toUserId: string): Promise<number> => {
    await new Promise(resolve => setTimeout(resolve, 80));
    let updated = 0
    mockAudits.forEach((a, idx) => {
      if (a.branchId !== branchId) return
      if (a.isArchived) return
      if (a.status === AuditStatus.DRAFT) {
        const next: Audit = { ...a, assignedTo: toUserId, updatedAt: new Date() }
        mockAudits[idx] = next
        addLog(toUserId, 'audit_reassigned_unstarted', `Reassigned not-started audit ${a.id} to new auditor`, 'audit', a.id)
        updated++
      }
    })
    return updated
  },

  /**
   * Batch variant: reassign only NOT-STARTED audits (DRAFT) across multiple branches.
   */
  reassignUnstartedAuditsForBranches: async (branchIds: string[], toUserId: string): Promise<number> => {
    let total = 0
    for (const bid of branchIds) {
      total += await mockApi.reassignUnstartedAuditsForBranch(bid, toUserId)
    }
    return total
  },

  /**
   * Set a specific audit's assignee (for open audits only). Used to support Undo.
   */
  setAuditAssignedTo: async (auditId: string, userId: string): Promise<Audit> => {
    await new Promise(resolve => setTimeout(resolve, 60));
    const idx = mockAudits.findIndex(a => a.id === auditId)
    if (idx === -1) throw new Error(`Audit not found: ${auditId}`)
    const current = mockAudits[idx]
    // Only allow for non-archived and open statuses
    if (current.isArchived) return current
    if (current.status !== AuditStatus.DRAFT && current.status !== AuditStatus.IN_PROGRESS && current.status !== AuditStatus.REJECTED) {
      return current
    }
    const next: Audit = { ...current, assignedTo: userId, updatedAt: new Date() }
    mockAudits[idx] = next
    addLog(userId, 'audit_assignee_set', `Set assignee for audit ${auditId}`, 'audit', auditId)
    return next
  },

  manualArchiveAudit: async (auditId: string, userId: string): Promise<Audit> => {
    await new Promise(resolve => setTimeout(resolve, 120));
    const idx = mockAudits.findIndex(a => a.id === auditId)
    if (idx === -1) throw new Error(`Audit not found: ${auditId}`)
    const current = mockAudits[idx]
    if (current.isArchived) return current
    const now = new Date()
    const next: Audit = { ...current, isArchived: true, archivedAt: now, updatedAt: now }
    mockAudits[idx] = next
    addLog(userId, 'audit_archived_manual', `Manually archived audit ${auditId}`, 'audit', auditId)
    return next
  },

  submitAuditForApproval: async (auditId: string, submittedBy: string): Promise<Audit> => {
    await new Promise(resolve => setTimeout(resolve, 150));
    const idx = mockAudits.findIndex(a => a.id === auditId);
    if (idx === -1) throw new Error(`Audit not found: ${auditId}`);
    const current = mockAudits[idx];
    // Permission: only the assignee or an admin can submit for approval
    const submitter = mockUsers.find(u => u.id === submittedBy)
    const isAdmin = submitter?.role === UserRole.ADMIN
    const isAssignee = current.assignedTo === submittedBy
    if (!isAdmin && !isAssignee) {
      throw new Error('Permission denied: Only assignee or admin can submit audit for approval')
    }
    if (!(current.status === AuditStatus.IN_PROGRESS || current.status === AuditStatus.COMPLETED)) {
      throw new Error(`Cannot submit audit ${auditId} from status ${current.status}`);
    }
    const next: Audit = { ...current, status: AuditStatus.SUBMITTED, submittedBy, submittedAt: new Date(), updatedAt: new Date() };
    mockAudits[idx] = next;
    addLog(current.assignedTo, 'audit_submitted', `Submitted audit ${auditId} for approval`, 'audit', auditId);
    return next;
  },

  setAuditApproval: async (
    auditId: string,
    payload: { status: 'approved' | 'rejected'; note?: string; userId: string; signatureUrl?: string; signatureType?: 'image' | 'typed' | 'drawn'; approvalName?: string }
  ): Promise<Audit> => {
    await new Promise(resolve => setTimeout(resolve, 150));
    const idx = mockAudits.findIndex(a => a.id === auditId);
    if (idx === -1) throw new Error(`Audit not found: ${auditId}`);
    const current = mockAudits[idx];
    // Permission: only admin or branch manager of the audit's branch can approve/reject
    const actor = mockUsers.find(u => u.id === payload.userId)
    const isAdmin = actor?.role === UserRole.ADMIN
    const isManager = actor?.role === UserRole.BRANCH_MANAGER && actor?.branchId === current.branchId
    if (!isAdmin && !isManager) {
      throw new Error('Permission denied: Only admin or branch manager can approve/reject')
    }
    const next: Audit = { ...current };
    if (payload.status === 'approved') {
      next.status = AuditStatus.APPROVED;
      next.approvedBy = payload.userId;
      next.approvedAt = new Date();
      next.approvalNote = payload.note || '';
      next.approvalSignatureUrl = payload.signatureUrl;
      next.approvalSignatureType = payload.signatureType;
      next.approvalName = payload.approvalName;
      // clear rejection metadata
      next.rejectedBy = undefined;
      next.rejectedAt = undefined;
      next.rejectionNote = undefined;
      addLog(payload.userId, 'audit_approved', payload.note || 'Approved', 'audit', auditId);
    } else {
      next.status = AuditStatus.REJECTED;
      next.rejectedBy = payload.userId;
      next.rejectedAt = new Date();
      next.rejectionNote = payload.note || '';
      // clear approval metadata
      next.approvedBy = undefined;
      next.approvedAt = undefined;
      next.approvalNote = undefined;
      addLog(payload.userId, 'audit_rejected', payload.note || 'Rejected', 'audit', auditId);
    }
    next.updatedAt = new Date();
    mockAudits[idx] = next;
    return next;
  },

  setAuditStatus: async (auditId: string, status: AuditStatus): Promise<Audit> => {
    await new Promise(resolve => setTimeout(resolve, 150));
    const idx = mockAudits.findIndex(a => a.id === auditId);
    if (idx === -1) throw new Error(`Audit not found: ${auditId}`);
    const current = mockAudits[idx];
    const next: Audit = { ...current, status, updatedAt: new Date() };
    mockAudits[idx] = next;
    addLog(current.assignedTo, 'audit_status_changed', `Status changed to ${status}`, 'audit', auditId);
    return next;
  },

  setOverrideScore: async (
    auditId: string,
    questionId: string,
    points: number,
    note: string,
    userId: string,
  ): Promise<Audit> => {
    await new Promise(resolve => setTimeout(resolve, 120));
    const idx = mockAudits.findIndex(a => a.id === auditId);
    if (idx === -1) throw new Error(`Audit not found: ${auditId}`);
    const current = mockAudits[idx];
    const next: Audit = {
      ...current,
      overrideScores: { ...(current.overrideScores || {}), [questionId]: points },
      overrideNotes: { ...(current.overrideNotes || {}), [questionId]: note },
      updatedAt: new Date(),
    };
    mockAudits[idx] = next;
    addLog(userId, 'na_override_set', `Override set for ${questionId}: ${points} pts`, 'audit', auditId);
    return next;
  },

  // Surveys CRUD (in-memory mocks)
  createSurvey: async (
    payload: Pick<Survey, 'title' | 'description' | 'sections' | 'createdBy'>
  ): Promise<Survey> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const now = new Date();
    const newSurvey: Survey = {
      id: `survey-${Date.now()}`,
      title: payload.title,
      description: payload.description,
      sections: payload.sections || [],
      version: 1,
      frequency: AuditFrequency.WEEKLY,
      createdBy: payload.createdBy,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };
    mockSurveys.unshift(newSurvey);
    addLog(payload.createdBy, 'survey_created', `Created survey ${newSurvey.title}`, 'survey', newSurvey.id);
    return newSurvey;
  },

  updateSurvey: async (
    id: string,
    updates: Partial<Pick<Survey, 'title' | 'description' | 'sections' | 'isActive' | 'frequency'>>
  ): Promise<Survey> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const idx = mockSurveys.findIndex(s => s.id === id);
    if (idx === -1) throw new Error(`Survey not found: ${id}`);
    const current = mockSurveys[idx];
    const sectionsChanged = updates.sections !== undefined;
    const next: Survey = {
      ...current,
      ...updates,
      version: sectionsChanged ? current.version + 1 : current.version,
      updatedAt: new Date(),
    };
    mockSurveys[idx] = next;
    addLog(current.createdBy, 'survey_updated', `Updated survey ${id}${sectionsChanged ? ' (version bumped)' : ''}`, 'survey', id);
    return next;
  },

  deleteSurvey: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 150));
    const idx = mockSurveys.findIndex(s => s.id === id);
    if (idx !== -1) {
      const removed = mockSurveys.splice(idx, 1)[0];
      addLog(removed.createdBy, 'survey_deleted', `Deleted survey ${removed.title}`, 'survey', id);
    }
  },

  duplicateSurvey: async (id: string, createdBy: string): Promise<Survey> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const original = mockSurveys.find(s => s.id === id);
    if (!original) throw new Error(`Survey not found: ${id}`);
    const now = new Date();
    const copy: Survey = {
      ...original,
      id: `survey-${Date.now()}`,
      title: `${original.title} (Copy)`,
      version: 1,
      frequency: original.frequency,
      createdBy,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };
    mockSurveys.unshift(copy);
    addLog(createdBy, 'survey_duplicated', `Duplicated survey ${original.title}`, 'survey', copy.id);
    return copy;
  },

  // Section-level attachments & comments
  addSectionPhoto: async (
    auditId: string,
    sectionId: string,
    payload: { filename: string; url: string; uploadedBy: string }
  ): Promise<AuditPhoto> => {
    await new Promise(resolve => setTimeout(resolve, 150));
    const audit = mockAudits.find(a => a.id === auditId);
    if (!audit) throw new Error(`Audit not found: ${auditId}`);
    const photo: AuditPhoto = {
      id: `photo-${Date.now()}`,
      auditId,
      sectionId,
      filename: payload.filename,
      url: payload.url,
      uploadedBy: payload.uploadedBy,
      uploadedAt: new Date(),
    };
    if (!audit.sectionPhotos) audit.sectionPhotos = [];
    audit.sectionPhotos.unshift(photo);
    audit.updatedAt = new Date();
    addLog(audit.assignedTo, 'photo_added', `Added photo ${photo.filename} to section ${sectionId}`, 'audit', auditId);
    return photo;
  },

  removeSectionPhoto: async (auditId: string, photoId: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 120));
    const audit = mockAudits.find(a => a.id === auditId);
    if (!audit) throw new Error(`Audit not found: ${auditId}`);
    if (audit.sectionPhotos) {
      const idx = audit.sectionPhotos.findIndex(p => p.id === photoId);
      if (idx !== -1) audit.sectionPhotos.splice(idx, 1);
    }
    audit.updatedAt = new Date();
    addLog(audit.assignedTo, 'photo_removed', `Removed photo ${photoId}`, 'audit', auditId);
  },

  setSectionComment: async (auditId: string, sectionId: string, comment: string): Promise<Audit> => {
    await new Promise(resolve => setTimeout(resolve, 120));
    const idx = mockAudits.findIndex(a => a.id === auditId);
    if (idx === -1) throw new Error(`Audit not found: ${auditId}`);
    const current = mockAudits[idx];
    const next: Audit = {
      ...current,
      sectionComments: { ...(current.sectionComments || {}), [sectionId]: comment },
      updatedAt: new Date(),
    };
    mockAudits[idx] = next;
    addLog(next.assignedTo, 'section_comment_set', `Updated comment for section ${sectionId}`, 'audit', auditId);
    return next;
  },
};
