# Trakr Database Access Control System

## Role Definitions

### SUPER_ADMIN
- **Scope**: ALL organizations (global view)
- **Access**: Full CRUD on all tables across all organizations
- **Special Abilities**:
  - Can switch between organizations
  - Can create/edit/delete organizations
  - Can manage users in any organization
  - Can view/edit any audit regardless of assignment
  - Can access all analytics globally

### ADMIN
- **Scope**: Single organization (their `org_id`)
- **Access**: Full CRUD within their organization
- **Special Abilities**:
  - Can manage all users in their org
  - Can create/edit survey templates
  - Can create/edit branches and zones
  - Can view all audits in their org
  - Can edit approved/submitted audits (admin override)
  - Can assign auditors to branches/zones
  - Can approve/reject audits (acts as manager)

### BRANCH_MANAGER
- **Scope**: Single organization + assigned branches
- **Access**: Read-only for most data, write access for assigned branches
- **Special Abilities**:
  - Can view all branches in their org (read-only)
  - Can approve/reject audits for branches they manage
  - Can view analytics for their managed branches
  - CANNOT create users, surveys, or branches
  - CANNOT edit approved audits
  - Can be assigned to multiple branches

### AUDITOR
- **Scope**: Single organization + assigned branches/zones
- **Access**: Most restrictive role
- **Special Abilities**:
  - Can only view branches assigned to them
  - Can create/edit/submit audits for assigned branches
  - Can only edit DRAFT, IN_PROGRESS, COMPLETED, or REJECTED audits
  - CANNOT edit SUBMITTED or APPROVED audits
  - CANNOT view other auditors' audits (unless assigned to same branch)
  - Can view surveys applicable to their branches

## Table-by-Table Access Matrix

### organizations
| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| SUPER_ADMIN | All orgs | ✅ | ✅ | ✅ |
| ADMIN | Own org | ❌ | Own org | ❌ |
| BRANCH_MANAGER | Own org | ❌ | ❌ | ❌ |
| AUDITOR | Own org | ❌ | ❌ | ❌ |

### users
| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| SUPER_ADMIN | All users | ✅ | ✅ | ✅ |
| ADMIN | Org users | Org users | Org users | Org users |
| BRANCH_MANAGER | Org users (read) | ❌ | Self only | ❌ |
| AUDITOR | Org users (read) | ❌ | Self only | ❌ |

### branches
| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| SUPER_ADMIN | All | ✅ | ✅ | ✅ |
| ADMIN | Org branches | Org branches | Org branches | Org branches |
| BRANCH_MANAGER | Org branches | ❌ | Assigned only | ❌ |
| AUDITOR | Assigned only | ❌ | ❌ | ❌ |

### surveys
| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| SUPER_ADMIN | All | ✅ | ✅ | ✅ |
| ADMIN | Org surveys | Org surveys | Org surveys | Org surveys |
| BRANCH_MANAGER | Org surveys | ❌ | ❌ | ❌ |
| AUDITOR | Applicable surveys | ❌ | ❌ | ❌ |

### audits
| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| SUPER_ADMIN | All | ✅ | ✅ | ✅ |
| ADMIN | Org audits | Org audits | Org audits | Org audits |
| BRANCH_MANAGER | Managed branch audits | ❌ | Review only | ❌ |
| AUDITOR | Own audits only | Own branches | Own DRAFT/IN_PROGRESS/REJECTED | Own DRAFT |

### auditor_assignments
| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| SUPER_ADMIN | All | ✅ | ✅ | ✅ |
| ADMIN | Org assignments | Org assignments | Org assignments | Org assignments |
| BRANCH_MANAGER | Org assignments | ❌ | ❌ | ❌ |
| AUDITOR | Own assignment | ❌ | ❌ | ❌ |

### zones
| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| SUPER_ADMIN | All | ✅ | ✅ | ✅ |
| ADMIN | Org zones | Org zones | Org zones | Org zones |
| BRANCH_MANAGER | Org zones | ❌ | ❌ | ❌ |
| AUDITOR | Assigned zones | ❌ | ❌ | ❌ |

### notifications
| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| SUPER_ADMIN | All | ✅ | ✅ | ✅ |
| ADMIN | Org notifications | System creates | Own notifications | Own notifications |
| BRANCH_MANAGER | Own notifications | ❌ | Own notifications | Own notifications |
| AUDITOR | Own notifications | ❌ | Own notifications | Own notifications |

## Critical Rules

1. **Auth Mapping**: Every user MUST have `auth_user_id` set to their Supabase auth UID
2. **Organization Scoping**: All tables (except `organizations`) MUST filter by `org_id`
3. **No Circular References**: Helper functions use `SECURITY DEFINER` to bypass RLS
4. **Assignment Checks**: Auditors can only access data for branches/zones they're assigned to
5. **Audit State Machine**: Auditors cannot edit SUBMITTED/APPROVED audits
6. **Manager Assignments**: Branch managers can only approve audits for branches they manage

## Helper Functions (SECURITY DEFINER)

These bypass RLS to avoid circular references:

1. `current_user_id()` - Returns public.users.id for logged-in user
2. `current_user_org_id()` - Returns org_id for logged-in user  
3. `current_user_role()` - Returns role for logged-in user
4. `is_super_admin()` - Returns true if user is SUPER_ADMIN
5. `is_admin_or_super()` - Returns true if ADMIN or SUPER_ADMIN
6. `user_assigned_branch_ids()` - Returns array of branch IDs assigned to current user
7. `user_managed_branch_ids()` - Returns array of branch IDs managed by current user
8. `can_user_access_branch(branch_id)` - Returns true if user can access branch
9. `can_user_edit_audit(audit_id)` - Returns true if user can edit audit
