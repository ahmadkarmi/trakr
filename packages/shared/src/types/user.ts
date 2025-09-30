export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  AUDITOR = 'auditor',
  BRANCH_MANAGER = 'branch_manager',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  orgId: string;
  branchId?: string;
  signatureUrl?: string; // optional pre-uploaded signature image for approvals
  avatarUrl?: string; // optional profile image
  emailVerified?: boolean; // whether the user has verified their email
  isActive?: boolean; // whether the user account is active
  lastSeenAt?: Date; // when the user was last seen
  createdAt: Date;
  updatedAt: Date;
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Super Admin',
  [UserRole.ADMIN]: 'Admin',
  [UserRole.AUDITOR]: 'Auditor',
  [UserRole.BRANCH_MANAGER]: 'Branch Manager',
};

export const USER_ROLE_EMOJIS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: '🧭',
  [UserRole.ADMIN]: '🛠️',
  [UserRole.AUDITOR]: '🕵️‍♂️',
  [UserRole.BRANCH_MANAGER]: '🏬',
};

export function getUserRoleFromKey(key: string): UserRole {
  const role = Object.values(UserRole).find(r => r === key);
  if (!role) {
    throw new Error(`Unknown role: ${key}`);
  }
  return role;
}
