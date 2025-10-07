# Insights Strategy - Organizational Scoping

**Date:** 2025-10-07

---

## 🎯 **Core Principle: Scope by Responsibility**

```
SUPER ADMIN → All Organizations (Platform Health)
    ↓
ADMIN → Their Organization Only (Org Performance)  
    ↓
BRANCH MANAGER → Their Branch Only (Team Management)
    ↓
AUDITOR → Personal Performance Only (Individual Tasks)
```

---

## 👤 **AUDITOR Insights (Personal Scope)**

**Focus:** "What do I need to do? How am I performing?"

### **Priority 1: My Tasks** 🚨
1. **Overdue Audits** - "You have {count} overdue"
2. **Due Today** - "{count} audits due today"
3. **Due This Week** - "Plan your {count} audits"
4. **Ready to Submit** - "{count} completed, not submitted"
5. **Rejected - Needs Rework** - "Manager feedback: {note}"

### **Priority 2: My Performance** 📊
6. **Completion Rate** - "You: {my}% vs Team: {team}%"
7. **Quality Score** - "You: {my}% vs Team: {team}%"
8. **Performance Trend** - "Improving/declining over 3 months"

### **Priority 3: My Growth** 🌱
9. **Category Performance** - "Weakest: {category} ({score}%)"
10. **Consistency** - "Score variance: {variance}%"
11. **Time Efficiency** - "You: {myTime}h vs Team: {teamTime}h"

### **Priority 4: Motivation** 🎉
12. **Milestones** - "10 audits completed!"
13. **Streaks** - "5 day completion streak"

---

## 👔 **BRANCH MANAGER Insights (Branch Scope)**

**Focus:** "What needs my attention? How is my branch doing?"

### **Priority 1: Manager Actions** 🚨
1. **Pending Approvals** - "{count} waiting (‌{overdue} overdue)"
2. **Branch Overdue** - "{count} by auditors: {names}"
3. **At-Risk** - "{count} due in 24 hours"
4. **Rejected Stalled** - "{count} not resubmitted in 3+ days"

### **Priority 2: Branch vs Org** 📊
5. **Completion Rate** - "Branch {rate}% vs Org {orgRate}%"
6. **Quality Score** - "Branch {score}% vs Org {orgScore}%"
7. **Branch Trend** - "+{percent}% over 3 months"
8. **Branch Ranking** - "#{rank} of {total} branches in org"

### **Priority 3: Team Management** 👥
9. **Struggling Members** - "{count} below 70% completion/quality"
10. **Top Performers** - "{count} above 90% completion/quality"
11. **Workload Balance** - "Variance: {percent}%"
12. **Skill Gaps** - "Team weakest in {category}"
13. **New Members** - "{count} onboarding (<30 days)"

---

## 👨‍💼 **ADMIN Insights (Organization Scope)**

**Focus:** "How is my organization? What needs fixing?"

### **Priority 1: Org Health** 🏢
1. **Org Overdue Rate** - "{percent}% of org audits overdue"
2. **Org Performance Trend** - "Declining {percent}% over 3 months"
3. **Approval Bottleneck** - "{percent}% pending, slowest: {managers}"
4. **Org Capacity** - "Auditors at {percent}% capacity"

### **Priority 2: Branch Comparison** 📊
5. **Branch Gap** - "Top {branch}: {rate}%, Bottom {branch}: {rate}%"
6. **Underperforming Branches** - "{count} below org avg by 15%+"
7. **Top Branches** - "{count} achieving 95%+ completion"
8. **Manager Effectiveness** - "Slowest approvals: {manager} ({hours}h)"

### **Priority 3: Resource Optimization** ⚙️
9. **Zone Coverage** - "{count} zones underserved"
10. **Auditor Distribution** - "Overloaded: {branches}, Underutilized: {branches}"
11. **Survey Performance** - "{count} surveys with low scores/long time"

### **Priority 4: Strategic** 📈
12. **Org Growth** - "{percent}% growth over 6 months"
13. **Seasonal Patterns** - "Peak months: {months}"
14. **Training Impact** - "Recent training: +{percent}% improvement"
15. **Benchmarking** - "Your org vs system average: {diff}%"

---

## 🌐 **SUPER ADMIN Insights (System-Wide Scope)**

**Focus:** "How is the platform? Which orgs need help?"

### **Priority 1: System Health** 🌐
1. **System Overdue Rate** - "{percent}% across all orgs"
2. **System Performance Trend** - "Declining {percent}%"
3. **Platform Performance** - "Avg load: {ms}ms, Errors: {percent}%"
4. **User Engagement** - "{percent}% active users"

### **Priority 2: Org Comparison** 🏢
5. **Org Performance Gap** - "Top: {org} ({rate}%), Bottom: {org} ({rate}%)"
6. **Struggling Orgs** - "{count} orgs below system avg by 20%+"
7. **Top Orgs** - "{count} achieving excellence"
8. **New Orgs** - "{count} onboarding (<90 days)"
9. **Inactive Orgs** - "{count} no audits in 30+ days"

### **Priority 3: Platform Optimization** ⚙️
10. **Feature Adoption** - "Low usage: {features}"
11. **Support Tickets** - "Top issues: {categories}"
12. **Survey Templates** - "{count} templates with low completion"
13. **Regional Performance** - "Best: {region}, Worst: {region}"

### **Priority 4: Growth & Strategy** 📈
14. **Platform Growth** - "{percent}% growth in active orgs"
15. **Churn Risk** - "{count} orgs declining in activity"
16. **License Utilization** - "{percent}% of seats used"
17. **Revenue Health** - "MRR: {value}, Growth: {percent}%"

---

## 🛠️ **Implementation Priorities**

### **Phase 1: Quick Fixes (Week 1)**
- ✅ **Auditor**: Replace static insights with real data
- ✅ **Branch Manager**: Add "Pending Approvals" critical insight
- ✅ **Branch Manager**: Fix "Team Development" to check actual data
- ✅ **Admin**: Add first 5 org health insights (currently has NONE!)

### **Phase 2: Complete Core (Week 2-3)**
- Complete all Priority 1 insights for each role
- Add Priority 2 insights for each role

### **Phase 3: Advanced Features (Week 4-5)**
- Priority 3 & 4 insights
- Trend analysis and predictions
- Comparative analytics

### **Phase 4: Polish (Week 6)**
- UI/UX improvements
- Performance optimization
- E2E testing

---

## 📊 **Data Filtering by Role**

```typescript
// AUDITOR: Only their audits
const auditorData = {
  audits: audits.filter(a => a.assignedTo === userId),
  teamAudits: audits.filter(a => a.branchId === userBranch && a.assignedTo !== userId)
}

// BRANCH MANAGER: Only their branch
const branchManagerData = {
  branchAudits: audits.filter(a => a.branchId === userBranch),
  branchAuditors: auditors.filter(a => a.branchId === userBranch),
  orgAudits: audits.filter(a => a.organizationId === userOrg), // For comparison
  orgAvg: calculateOrgAverage(userOrg)
}

// ADMIN: Only their organization
const adminData = {
  orgAudits: audits.filter(a => a.organizationId === userOrg),
  orgBranches: branches.filter(b => b.organizationId === userOrg),
  orgAuditors: auditors.filter(a => a.organizationId === userOrg),
  orgManagers: managers.filter(m => m.organizationId === userOrg),
  systemAvg: calculateSystemAverage() // For benchmarking
}

// SUPER ADMIN: All data
const superAdminData = {
  allOrgs: organizations, // All organizations
  allAudits: audits,      // All audits
  allUsers: users,        // All users
  platformMetrics: calculatePlatformMetrics()
}
```

---

## ✅ **Success Criteria**

Each insight MUST:
- [ ] Use 100% real data (no hardcoded values)
- [ ] Only show when condition is true
- [ ] Be scoped correctly (no data leakage across orgs)
- [ ] Provide actionable guidance
- [ ] Link to relevant section
- [ ] Have appropriate priority/color
- [ ] Be tested with proper data isolation

---

## 🎨 **Insight Card Design**

```typescript
<InsightCard
  priority="critical" | "high" | "medium" | "low"
  type="danger" | "warning" | "info" | "success" | "achievement"
  icon="🚨" | "⏳" | "📊" | etc
  title="3 Overdue Audits"
  message="Complete Site A (due 3 days ago)"
  action={{
    label: "View Audits",
    onClick: () => navigate('/audits?filter=overdue')
  }}
  details={optionalDetailsComponent}
/>
```

**Priority Display Order:**
1. Critical (Red) - Immediate action needed
2. High (Orange) - Attention needed soon
3. Medium (Blue) - Important information
4. Low (Green/Purple) - Nice to know / celebration

---

**Ready to implement!** Start with Phase 1 quick fixes. 🚀
