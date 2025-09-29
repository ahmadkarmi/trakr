export interface Organization {
  id: string;
  name: string;
  description?: string;
  // Scheduling & policy settings
  timeZone?: string; // IANA timezone, e.g. 'UTC', 'Europe/Athens'
  weekStartsOn?: 0 | 1; // 0=Sunday, 1=Monday
  gatingPolicy?: 'any' | 'completed_approved'; // gating rule for starting new audits in a period
  createdAt: Date;
  updatedAt: Date;
}

export interface Branch {
  id: string;
  name: string;
  address?: string;
  orgId: string;
  managerId?: string; // Deprecated: kept for backward compatibility
  createdAt: Date;
  updatedAt: Date;
}

export interface Zone {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  branchIds: string[]; // branches included in this zone
  createdAt: Date;
  updatedAt: Date;
}

export enum AuditFrequency {
  UNLIMITED = 'unlimited',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
}

export interface AuditorAssignment {
  userId: string; // auditor user id
  branchIds: string[];
  zoneIds: string[];
}

export interface BranchManagerAssignment {
  id: string;
  branchId: string;
  managerId: string;
  assignedAt: Date;
  assignedBy: string; // Who made the assignment
  isActive: boolean;
}

export interface LogEntry {
  id: string;
  userId: string;
  action: string;
  details: string;
  entityType: string;
  entityId: string;
  timestamp: Date;
}
