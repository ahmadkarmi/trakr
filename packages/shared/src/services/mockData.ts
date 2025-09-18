import { User, UserRole, Audit, AuditStatus, Survey, Organization, Branch, LogEntry } from '../types';

// Mock Organizations
export const mockOrganizations: Organization[] = [
  {
    id: 'org-1',
    name: 'Acme Corporation',
    description: 'Leading retail chain with multiple branches',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
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
    id: 'user-2',
    name: 'Jane Manager',
    email: 'manager@trakr.com',
    role: UserRole.BRANCH_MANAGER,
    orgId: 'org-1',
    branchId: 'branch-1',
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
            type: 'yes_no' as any,
            required: true,
            order: 1,
          },
          {
            id: 'q2',
            text: 'Are emergency exits clearly marked and unobstructed?',
            type: 'yes_no' as any,
            required: true,
            order: 2,
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
            type: 'yes_no' as any,
            required: true,
            order: 1,
          },
          {
            id: 'q4',
            text: 'Is adequate lighting provided throughout the store?',
            type: 'yes_no' as any,
            required: true,
            order: 2,
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

  // Audits
  getAudits: async (filters?: { assignedTo?: string; status?: AuditStatus }): Promise<Audit[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    let filteredAudits = [...mockAudits];
    
    if (filters?.assignedTo) {
      filteredAudits = filteredAudits.filter(audit => audit.assignedTo === filters.assignedTo);
    }
    
    if (filters?.status) {
      filteredAudits = filteredAudits.filter(audit => audit.status === filters.status);
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

  // Branches
  getBranches: async (orgId?: string): Promise<Branch[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return orgId 
      ? mockBranches.filter(branch => branch.orgId === orgId)
      : mockBranches;
  },

  // Activity Logs
  getActivityLogs: async (entityId?: string): Promise<LogEntry[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return entityId
      ? mockActivityLogs.filter(log => log.entityId === entityId)
      : mockActivityLogs;
  },

  // Mutations (in-memory)
  saveAuditProgress: async (
    auditId: string,
    updates: {
      responses?: Record<string, string>;
      naReasons?: Record<string, string>;
    }
  ): Promise<Audit> => {
    await new Promise(resolve => setTimeout(resolve, 150));
    const idx = mockAudits.findIndex(a => a.id === auditId);
    if (idx === -1) throw new Error(`Audit not found: ${auditId}`);
    const current = mockAudits[idx];
    const next: Audit = {
      ...current,
      responses: { ...current.responses, ...(updates.responses || {}) },
      naReasons: { ...current.naReasons, ...(updates.naReasons || {}) },
      status: current.status === AuditStatus.DRAFT ? AuditStatus.IN_PROGRESS : current.status,
      updatedAt: new Date(),
    };
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
    return next;
  },
};
