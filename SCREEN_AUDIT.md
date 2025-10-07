# Trakr Screen Audit - Supabase Integration Verification

**Goal:** Verify all screens are properly integrated with Supabase and functioning correctly.

---

## **Screen Organization by Role**

### **🔴 ADMIN SCREENS** (Requires ADMIN/SUPER_ADMIN role)

1. **DashboardAdmin** (`/dashboard/admin`)
   - [ ] Dashboard statistics from Supabase
   - [ ] Weekly audits query
   - [ ] Zone coverage data
   - [ ] Recent activity feed
   - [ ] Audit listing with filters
   
2. **ManageSurveyTemplates** (`/manage/surveys`)
   - [ ] Survey templates list from Supabase
   - [ ] Create/Edit/Delete operations
   - [ ] Duplicate functionality
   
3. **SurveyTemplateEditor** (`/manage/surveys/create`, `/manage/surveys/:id/edit`)
   - [ ] Load survey from Supabase
   - [ ] Save survey to Supabase
   - [ ] Section and question CRUD
   
4. **ManageBranches** (`/manage/branches`)
   - [ ] Branches list from Supabase
   - [ ] Create/Edit/Delete operations
   - [ ] Branch manager assignments
   
5. **ManageZones** (`/manage/zones`)
   - [ ] Zones list from Supabase
   - [ ] Create/Edit/Delete operations
   - [ ] Branch assignments to zones
   
6. **ManageAssignments** (`/manage/assignments`)
   - [ ] Assignment data from Supabase
   - [ ] Assign/unassign functionality
   
7. **ManageUsers** (`/manage/users`)
   - [ ] Users list from Supabase
   - [ ] Invite/Edit/Delete operations
   - [ ] Role management

---

### **🟡 BRANCH MANAGER SCREENS**

1. **DashboardBranchManager** (`/dashboard/branch-manager`)
   - [ ] Dashboard statistics for assigned branches
   - [ ] Pending approvals from Supabase
   - [ ] Branch performance metrics
   - [ ] Audit listing for managed branches

2. **AuditReviewScreen** (`/audit/:auditId/review`)
   - [ ] Load audit from Supabase
   - [ ] Approve/Reject functionality
   - [ ] Comments and feedback

---

### **🟢 AUDITOR SCREENS**

1. **DashboardAuditor** (`/dashboard/auditor`)
   - [ ] Dashboard statistics for auditor
   - [ ] Assigned audits from Supabase
   - [ ] Due dates and priorities
   - [ ] Quick actions

2. **AuditWizard** (`/audit/:auditId/wizard`)
   - [ ] Load audit from Supabase
   - [ ] Save responses to Supabase
   - [ ] Image upload functionality
   - [ ] Submit audit

---

### **🔵 SHARED SCREENS** (All roles)

1. **Profile** (`/profile`)
   - [ ] Load user data from Supabase
   - [ ] Update profile to Supabase
   - [ ] Avatar upload

2. **ProfileSignature** (`/profile/signature`)
   - [ ] Load signature from Supabase
   - [ ] Save signature to Supabase

3. **Settings** (`/settings`)
   - [ ] Load org settings from Supabase (admin only)
   - [ ] Update settings to Supabase
   - [ ] User preferences

4. **Notifications** (`/notifications`)
   - [ ] Load notifications from Supabase
   - [ ] Mark as read functionality
   - [ ] Delete notifications

5. **Analytics** (`/analytics`)
   - [ ] Load analytics data from Supabase
   - [ ] Role-specific views
   - [ ] Export functionality

6. **ActivityLogs** (`/activity/logs`)
   - [ ] Load activity logs from Supabase
   - [ ] Filter and search
   - [ ] Pagination

7. **AuditSummary** (`/audits/:auditId/summary`)
   - [ ] Load audit from Supabase
   - [ ] Display all responses
   - [ ] Print/Export functionality

8. **AuditDetail** (`/audit/:auditId`)
   - [ ] Load audit from Supabase
   - [ ] View audit details
   - [ ] Status transitions

9. **SearchResults** (`/search`)
   - [ ] Search across Supabase data
   - [ ] Filter results
   - [ ] Navigation to results

10. **Help** (`/help`)
    - [ ] Help content (may be static)
    - [ ] Support links

---

## **Audit Checklist for Each Screen**

For each screen, verify:

1. **✅ Data Source**
   - [ ] Uses `api.ts` methods (Supabase)
   - [ ] NOT using mock data directly
   - [ ] Proper error handling

2. **✅ Queries**
   - [ ] React Query `useQuery` for reads
   - [ ] Proper query keys
   - [ ] Loading states
   - [ ] Error states

3. **✅ Mutations**
   - [ ] React Query `useMutation` for writes
   - [ ] Proper invalidation of queries
   - [ ] Success/error feedback
   - [ ] Optimistic updates (where appropriate)

4. **✅ Permissions**
   - [ ] Role-based access control
   - [ ] User can only see their data
   - [ ] Admin restrictions enforced

5. **✅ UI/UX**
   - [ ] Responsive design
   - [ ] Loading skeletons
   - [ ] Empty states
   - [ ] Error messages
   - [ ] Success feedback

---

## **Findings**

### **Issues Found**
- [ ] Issue 1: Description
- [ ] Issue 2: Description

### **Improvements Needed**
- [ ] Improvement 1: Description
- [ ] Improvement 2: Description

---

## **Next Steps**
1. Complete audit for each screen
2. Document all issues
3. Prioritize fixes
4. Implement fixes
5. Test thoroughly
