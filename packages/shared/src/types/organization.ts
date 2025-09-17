export interface Organization {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Branch {
  id: string;
  name: string;
  address?: string;
  orgId: string;
  managerId?: string;
  createdAt: Date;
  updatedAt: Date;
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
