# Insights & Recommendations System - Comprehensive Analysis

**Purpose:** Provide actionable, data-driven insights tailored to each user role  
**Goal:** Guide users toward better performance and outcomes  
**Date:** 2025-10-07

---

## 📊 **Current State Analysis**

### **1. Admin Analytics** ❌ NO INSIGHTS
**Current State:** No insights/recommendations section exists  
**Data Available:**
- Total audits, completion rate, average score
- Pending approval count + overdue subset
- Active branches, auditors, zones
- Branch performance table
- Auditor rankings table
- Monthly trends
- Quality distribution

**Problems:**
- Admins have no guidance on system health
- No actionable recommendations
- Tables show data but no interpretation
- Missing trend analysis
- No alerts for systemic issues

---

### **2. Branch Manager Analytics** ⚠️ BASIC STATIC INSIGHTS
**Current State:** 3 hardcoded insights that don't change based on data

**Existing Insights:**
```
✓ Strong Performance
  "Your branch completion rate is X% above system average"
  Logic: Always shows if branchCompletionRate > systemCompletionRate
  
ℹ Team Development
  "Consider additional training for team members with completion rates below 80%"
  Logic: Always shows (static, no data check)
  
⚠ Action Required
  "X audits are overdue and need immediate attention"
  Logic: Only shows if overdueBranchAudits > 0
```

**Problems:**
- 2 of 3 insights are static (not data-driven)
- "Team Development" shows even if all team members above 80%
- "Strong Performance" only compares to system average, ignores trends
- No insights about pending approvals (important for managers!)
- No quality score analysis
- No team member-specific guidance
- Missing comparison to other branches

---

### **3. Auditor Analytics** ⚠️ MIXED STATIC/DYNAMIC INSIGHTS
**Current State:** 4 insights, 2 dynamic, 2 static

**Existing Insights:**
```
🏆 Excellent Performance (Dynamic)
  "Your completion rate is X% above team average"
  Logic: Only shows if myCompletionRate >= teamCompletionRate
  ✅ Good: Data-driven, positive reinforcement
  
📈 Growth Opportunity (Static)
  "Focus on Environmental audits to improve overall quality score"
  Logic: Always shows, hardcoded category
  ❌ Problem: Not based on actual audit data
  
🎯 Consistency Achievement (Static)
  "Your score consistency is excellent at 92%"
  Logic: Always shows, hardcoded percentage
  ❌ Problem: Not calculated from real data
  
⚠️ Attention Needed (Dynamic)
  "You have X overdue audits"
  Logic: Only shows if overdueMyAudits > 0
  ✅ Good: Data-driven, actionable
```

**Problems:**
- 50% of insights use fake/hardcoded data
- No real consistency calculation
- Category performance not calculated from actual audits
- Missing: submission guidance, quality trends, time management

---

### **4. Super Admin Analytics** ❓ UNKNOWN
**Status:** Need to check if this role exists and has analytics

---

## 🎯 **Proposed Insights System**

### **Core Principles:**
1. **100% Data-Driven** - No hardcoded messages
2. **Actionable** - Every insight includes what to do
3. **Role-Specific** - Tailored to user's responsibilities
4. **Priority-Based** - Critical issues shown first
5. **Contextual** - Only show when relevant
6. **Positive Reinforcement** - Celebrate good performance

---

## 👤 **Role 1: AUDITOR Insights**

**Primary Goals:**
- Complete audits on time
- Maintain quality standards
- Improve skills
- Stay motivated

### **Proposed Insights:**

#### **Priority 1: Urgent Actions** 🚨
```typescript
// 1. Overdue Audits
if (overdueMyAudits > 0) {
  Show: "⚠️ Attention Needed"
  Message: "{count} audit{s} overdue. Prioritize: {list oldest 2}"
  Action: Link to overdue audits
  Color: Red (danger)
}

// 2. Due Soon (next 3 days)
const dueSoon = myAudits.filter(a => 
  a.dueAt && 
  daysUntilDue(a) <= 3 && 
  daysUntilDue(a) > 0 &&
  a.status !== 'APPROVED'
)
if (dueSoon.length > 0) {
  Show: "⏰ Coming Up"
  Message: "{count} audit{s} due in next 3 days"
  Action: Link to upcoming audits
  Color: Orange (warning)
}

// 3. Pending Submissions (COMPLETED but not SUBMITTED)
const completedNotSubmitted = myAudits.filter(a => 
  a.status === 'COMPLETED'
)
if (completedNotSubmitted.length > 0) {
  Show: "📤 Ready to Submit"
  Message: "{count} audit{s} completed but not submitted yet"
  Action: Link to completed audits
  Color: Blue (info)
}
```

#### **Priority 2: Performance Feedback** 📊
```typescript
// 4. Performance vs Team
if (myCompletionRate >= teamCompletionRate + 10) {
  Show: "🏆 Outstanding Performance"
  Message: "Your completion rate ({myRate}%) is {diff}% above team average ({teamRate}%). Excellent work!"
  Color: Green (success)
} else if (myCompletionRate >= teamCompletionRate) {
  Show: "✓ Above Average"
  Message: "Your completion rate ({myRate}%) exceeds team average ({teamRate}%)"
  Color: Green (success)
} else if (myCompletionRate < teamCompletionRate - 10) {
  Show: "📈 Improvement Opportunity"
  Message: "Your completion rate ({myRate}%) is below team average ({teamRate}%). Focus on completing audits on time."
  Color: Orange (warning)
}

// 5. Quality Score Analysis
if (myAverageScore >= 90) {
  Show: "⭐ High Quality Work"
  Message: "Your quality score ({score}%) is excellent. Keep maintaining these standards!"
  Color: Green (success)
} else if (myAverageScore < 70) {
  Show: "🎯 Quality Focus Needed"
  Message: "Your quality score ({score}%) is below target (70%). Review common issues and best practices."
  Action: Link to training resources
  Color: Orange (warning)
}

// 6. Quality Trend
const last3Months = getLastNMonths(myAudits, 3)
const qualityTrend = calculateTrend(last3Months.map(m => m.avgScore))
if (qualityTrend > 5) {
  Show: "📈 Improving Quality"
  Message: "Your quality score has improved {trend}% over 3 months. Great progress!"
  Color: Green (success)
} else if (qualityTrend < -5) {
  Show: "⚠️ Quality Declining"
  Message: "Your quality score has dropped {trend}% over 3 months. Review recent audits for common issues."
  Color: Red (warning)
}
```

#### **Priority 3: Growth & Development** 🌱
```typescript
// 7. Category Performance
const categories = groupByCategory(myAudits, surveys)
const lowestCategory = categories.sort((a, b) => a.avgScore - b.avgScore)[0]
const highestCategory = categories.sort((a, b) => b.avgScore - a.avgScore)[0]

if (lowestCategory && lowestCategory.avgScore < 75) {
  Show: "📚 Growth Opportunity"
  Message: "Your {category} audits average {score}%. Focus here to improve overall performance."
  Action: Link to category training
  Color: Blue (info)
}

// 8. Consistency Achievement
const scoreVariance = calculateVariance(myAudits.map(a => a.score))
if (scoreVariance < 10) { // Low variance = high consistency
  Show: "🎯 Consistent Quality"
  Message: "Your score variance is only {variance}%, showing reliable audit quality."
  Color: Green (success)
}

// 9. Productivity Milestone
if (completedMyAudits % 10 === 0 && completedMyAudits > 0) {
  Show: "🎉 Milestone Achieved"
  Message: "You've completed {count} audits! Great productivity."
  Color: Purple (achievement)
}
```

#### **Priority 4: Time Management** ⏱️
```typescript
// 10. Time Per Audit
const avgTime = calculateAvgTimePerAudit(myAudits)
const teamAvgTime = calculateAvgTimePerAudit(teamAudits)

if (avgTime < teamAvgTime * 0.8) {
  Show: "⚡ Efficient Auditor"
  Message: "You complete audits {percent}% faster than team average"
  Color: Green (success)
} else if (avgTime > teamAvgTime * 1.2) {
  Show: "⏱️ Time Optimization"
  Message: "Consider streamlining your process - team average is {teamTime}"
  Color: Blue (info)
}
```

---

## 👔 **Role 2: BRANCH MANAGER Insights**

**Primary Goals:**
- Ensure team completes audits on time
- Maintain branch quality standards
- Develop team members
- Approve/reject submitted audits
- Compare branch to system

### **Proposed Insights:**

#### **Priority 1: Immediate Actions** 🚨
```typescript
// 1. Pending Approvals (especially overdue)
if (pendingApprovalAudits > 0) {
  Show: "⏳ Pending Reviews"
  Message: "{count} audit{s} awaiting your approval{pendingOverdue > 0 ? `, ${pendingOverdue} overdue` : ''}"
  Action: Link to pending audits
  Color: pendingOverdue > 0 ? Red : Orange
  Priority: CRITICAL
}

// 2. Overdue Branch Audits
if (overdueBranchAudits > 0) {
  Show: "🚨 Action Required"
  Message: "{count} audit{s} overdue. Follow up with: {listAuditors}"
  Action: Show audit list with assigned auditors
  Color: Red (danger)
  Priority: CRITICAL
}

// 3. At-Risk Audits (due in 24 hours, not complete)
const atRisk = branchAudits.filter(a => 
  a.dueAt && 
  hoursUntilDue(a) <= 24 &&
  a.status !== 'COMPLETED' &&
  a.status !== 'SUBMITTED' &&
  a.status !== 'APPROVED'
)
if (atRisk.length > 0) {
  Show: "⚠️ Due Tomorrow"
  Message: "{count} audit{s} due within 24 hours. Auditors: {names}"
  Action: Link to at-risk audits
  Color: Orange (warning)
}
```

#### **Priority 2: Branch Performance** 📊
```typescript
// 4. Branch vs System Comparison
const performanceDiff = branchCompletionRate - systemCompletionRate

if (performanceDiff >= 10) {
  Show: "🏆 Top Performing Branch"
  Message: "Your branch completion rate ({branchRate}%) is {diff}% above system average. Excellent team management!"
  Color: Green (success)
} else if (performanceDiff >= 5) {
  Show: "✓ Above Average Performance"
  Message: "Branch completion rate ({branchRate}%) exceeds system average ({systemRate}%)"
  Color: Green (success)
} else if (performanceDiff <= -10) {
  Show: "📉 Performance Gap"
  Message: "Branch completion rate ({branchRate}%) is {diff}% below system average. Review team capacity and blockers."
  Action: Link to team performance
  Color: Red (warning)
} else if (performanceDiff < 0) {
  Show: "📈 Room for Improvement"
  Message: "Branch completion rate ({branchRate}%) is slightly below system average ({systemRate}%)"
  Color: Orange (info)
}

// 5. Quality Score Analysis
if (branchAverageScore >= 90) {
  Show: "⭐ High Quality Branch"
  Message: "Branch quality score ({score}%) exceeds excellence threshold"
  Color: Green (success)
} else if (branchAverageScore < 75) {
  Show: "🎯 Quality Improvement Needed"
  Message: "Branch quality score ({score}%) below target. Review common issues and provide training."
  Action: Link to quality analysis
  Color: Orange (warning)
}

// 6. Branch Trend Analysis
const trend = calculateBranchTrend(branchAudits, 3) // 3 months
if (trend.completionRate > 10) {
  Show: "📈 Strong Growth"
  Message: "Branch completion rate improved {percent}% over 3 months"
  Color: Green (success)
} else if (trend.completionRate < -10) {
  Show: "⚠️ Declining Performance"
  Message: "Branch completion rate declined {percent}% over 3 months. Investigate capacity issues."
  Color: Red (warning)
}
```

#### **Priority 3: Team Development** 👥
```typescript
// 7. Struggling Team Members
const strugglingAuditors = teamMembers.filter(a => 
  a.completionRate < 70 || a.avgScore < 70
)
if (strugglingAuditors.length > 0) {
  Show: "👤 Team Support Needed"
  Message: "{count} team member{s} below performance thresholds. Consider 1-on-1 coaching."
  Details: List names + metrics
  Action: Link to individual performance
  Color: Orange (warning)
}

// 8. Top Performers
const topPerformers = teamMembers.filter(a => 
  a.completionRate >= 90 && a.avgScore >= 90
)
if (topPerformers.length > 0) {
  Show: "⭐ Outstanding Team Members"
  Message: "{count} team member{s} achieving excellence: {names}"
  Color: Green (success)
}

// 9. New Team Members (< 30 days)
const newMembers = teamMembers.filter(a => 
  daysSinceFirstAudit(a) < 30
)
if (newMembers.length > 0) {
  Show: "👋 Onboarding in Progress"
  Message: "{count} new team member{s}: {names}. Monitor their first audits closely."
  Color: Blue (info)
}

// 10. Training Opportunity
const lowCategoryPerformance = identifyWeakCategories(branchAudits, surveys)
if (lowCategoryPerformance.length > 0) {
  Show: "📚 Training Recommendation"
  Message: "Team scores lowest in {category} audits ({avgScore}%). Consider targeted training."
  Action: Link to training resources
  Color: Blue (info)
}
```

#### **Priority 4: Capacity & Workload** ⚖️
```typescript
// 11. Workload Imbalance
const workloadVariance = calculateWorkloadVariance(teamMembers)
if (workloadVariance > 30) { // >30% variance
  Show: "⚖️ Uneven Workload"
  Message: "Audit distribution varies by {variance}% across team. Consider rebalancing."
  Details: Show workload per auditor
  Color: Orange (info)
}

// 12. Team Capacity Alert
const avgAuditsPerPerson = branchAudits.length / teamMembers.length
if (avgAuditsPerPerson > 15) {
  Show: "📊 High Team Load"
  Message: "Average {avgCount} audits per team member. Monitor for burnout risk."
  Color: Orange (warning)
}
```

---

## 👨‍💼 **Role 3: ADMIN Insights**

**Primary Goals:**
- System health monitoring
- Cross-branch performance
- Resource allocation
- Policy effectiveness
- Identify systemic issues

### **Proposed Insights:**

#### **Priority 1: System Alerts** 🚨
```typescript
// 1. System-Wide Overdue Rate
const totalOverdue = audits.filter(isOverdue).length
const overdueRate = (totalOverdue / totalAudits) * 100

if (overdueRate > 20) {
  Show: "🚨 High Overdue Rate"
  Message: "{overdueRate}% of audits overdue ({count}). Systemic issue requiring attention."
  Details: Breakdown by branch
  Color: Red (critical)
} else if (overdueRate > 10) {
  Show: "⚠️ Elevated Overdue Rate"
  Message: "{overdueRate}% of audits overdue. Monitor closely."
  Color: Orange (warning)
}

// 2. Completion Rate Declining
const trend = calculateSystemTrend(audits, 3)
if (trend.completionRate < -5) {
  Show: "📉 System Performance Decline"
  Message: "Completion rate dropped {percent}% over 3 months. Investigate causes."
  Details: Breakdown by branch
  Color: Red (warning)
}

// 3. Quality Score Dropping
if (trend.qualityScore < -5) {
  Show: "⚠️ Quality Standards Declining"
  Message: "System quality score dropped {percent}% over 3 months"
  Action: Review survey questions and training
  Color: Red (warning)
}

// 4. Pending Approval Bottleneck
if (pendingApprovalAudits > totalAudits * 0.15) { // >15% pending
  Show: "⏳ Approval Bottleneck"
  Message: "{count} audits pending approval ({percent}% of total). Managers may need support."
  Details: Breakdown by branch manager
  Color: Orange (warning)
}
```

#### **Priority 2: Branch Comparisons** 📊
```typescript
// 5. Branch Performance Distribution
const branchPerformance = branches.map(b => ({
  ...b,
  completionRate: calculateBranchRate(b),
  avgScore: calculateBranchScore(b)
}))

const topBranch = branchPerformance[0]
const bottomBranch = branchPerformance[branchPerformance.length - 1]
const gap = topBranch.completionRate - bottomBranch.completionRate

if (gap > 30) {
  Show: "📊 Large Performance Gap"
  Message: "{topBranch} ({topRate}%) vs {bottomBranch} ({bottomRate}%) = {gap}% difference"
  Recommendation: "Share best practices from top branches"
  Color: Orange (info)
}

// 6. Underperforming Branches
const underperforming = branchPerformance.filter(b => 
  b.completionRate < systemCompletionRate - 15
)
if (underperforming.length > 0) {
  Show: "🎯 Branches Needing Support"
  Message: "{count} branch{es} significantly below system average"
  Details: List branches with metrics
  Action: "Consider resource reallocation or training"
  Color: Red (warning)
}

// 7. Top Performing Branches
const topPerforming = branchPerformance.filter(b => 
  b.completionRate >= 95 && b.avgScore >= 90
)
if (topPerforming.length > 0) {
  Show: "🏆 Excellence Recognition"
  Message: "{count} branch{es} achieving excellence: {names}"
  Recommendation: "Document and share their best practices"
  Color: Green (success)
}
```

#### **Priority 3: Resource Optimization** ⚙️
```typescript
// 8. Auditor Utilization
const utilizationRate = calculateAuditorUtilization(auditors, audits)
if (utilizationRate < 60) {
  Show: "📊 Low Auditor Utilization"
  Message: "Auditors at {rate}% capacity. Consider increased audit frequency or reduced headcount."
  Color: Blue (info)
} else if (utilizationRate > 90) {
  Show: "⚠️ High Auditor Load"
  Message: "Auditors at {rate}% capacity. Consider hiring or reducing audit frequency."
  Color: Orange (warning)
}

// 9. Zone Coverage Analysis
const zonePerformance = zones.map(z => ({
  ...z,
  branchCount: branches.filter(b => b.zoneId === z.id).length,
  avgCompletion: calculateZoneCompletion(z)
}))

const underservedZones = zonePerformance.filter(z => 
  z.branchCount < 2 || z.avgCompletion < 70
)
if (underservedZones.length > 0) {
  Show: "🗺️ Zone Coverage Gaps"
  Message: "{count} zone{s} with low branch count or performance"
  Details: List zones
  Action: "Consider opening new branches or reassigning resources"
  Color: Blue (info)
}
```

#### **Priority 4: Policy & Training** 📚
```typescript
// 10. Survey Performance Analysis
const surveyPerformance = surveys.map(s => ({
  ...s,
  auditsCompleted: audits.filter(a => a.surveyId === s.id).length,
  avgScore: calculateSurveyAvgScore(s),
  avgTime: calculateSurveyAvgTime(s)
}))

const problematicSurveys = surveyPerformance.filter(s => 
  s.avgScore < 70 || s.avgTime > averageTime * 1.5
)
if (problematicSurveys.length > 0) {
  Show: "📝 Survey Optimization"
  Message: "{count} survey{s} with low scores or long completion times"
  Details: List surveys with metrics
  Action: "Review questions, simplify, or provide better guidance"
  Color: Orange (info)
}

// 11. Training Effectiveness
// Track if auditors improve after training events
const recentTraining = getRecentTrainingEvents()
if (recentTraining.length > 0) {
  const preTrainingScores = calculateScoresBefore(recentTraining)
  const postTrainingScores = calculateScoresAfter(recentTraining)
  const improvement = postTrainingScores - preTrainingScores
  
  if (improvement > 5) {
    Show: "📚 Training Success"
    Message: "Recent training improved quality scores by {improvement}%"
    Color: Green (success)
  } else if (improvement < 0) {
    Show: "📚 Training Review Needed"
    Message: "No improvement observed after recent training. Review content and delivery."
    Color: Orange (warning)
  }
}
```

#### **Priority 5: Growth & Trends** 📈
```typescript
// 12. System Growth
const monthlyGrowth = calculateMonthlyGrowth(audits, 6)
if (monthlyGrowth > 20) {
  Show: "📈 Rapid Growth"
  Message: "Audit volume increased {percent}% over 6 months"
  Action: "Ensure adequate staffing and resources"
  Color: Blue (info)
}

// 13. Seasonal Patterns
const seasonalPattern = detectSeasonalPattern(audits, 12)
if (seasonalPattern.detected) {
  Show: "📅 Seasonal Trend Detected"
  Message: "Audit volume peaks in {months}. Plan staffing accordingly."
  Color: Blue (info)
}
```

---

## 🔧 **Implementation Strategy**

### **Phase 1: Foundation (Week 1-2)**
1. Create `InsightsEngine` utility class
2. Implement calculation functions:
   - `calculateTrend()`
   - `calculateVariance()`
   - `groupByCategory()`
   - `daysUntilDue()`
   - `hoursUntilDue()`
3. Write unit tests for calculations

### **Phase 2: Auditor Insights (Week 3)**
1. Implement all auditor insights (Priority 1-4)
2. Replace static insights with data-driven ones
3. Add unit tests
4. Manual QA testing

### **Phase 3: Branch Manager Insights (Week 4)**
1. Implement all manager insights (Priority 1-4)
2. Replace existing static insights
3. Add team member analysis
4. Unit tests + QA

### **Phase 4: Admin Insights (Week 5-6)**
1. Implement all admin insights (Priority 1-5)
2. Add branch comparison analytics
3. System health monitoring
4. Unit tests + QA

### **Phase 5: Polish & Optimization (Week 7)**
1. Add animations/transitions
2. Implement insight caching
3. Performance optimization
4. E2E tests

---

## 📁 **File Structure**

```
packages/shared/src/utils/
  insights/
    index.ts                 # Main exports
    calculations.ts          # Shared calculation functions
    auditor-insights.ts      # Auditor insight logic
    manager-insights.ts      # Manager insight logic
    admin-insights.ts        # Admin insight logic
    types.ts                 # TypeScript types
    constants.ts             # Thresholds, colors, icons

apps/web/src/components/
  analytics/
    InsightCard.tsx          # Reusable insight component
    InsightsSection.tsx      # Container for insights
```

---

## 🎨 **UI Components**

### **InsightCard Component:**
```typescript
interface InsightCardProps {
  type: 'success' | 'warning' | 'danger' | 'info' | 'achievement'
  icon: string
  title: string
  message: string
  action?: {
    label: string
    onClick: () => void
  }
  priority?: 'critical' | 'high' | 'medium' | 'low'
  details?: React.ReactNode
}
```

### **Priority Ordering:**
- Critical (Red) → Top
- High (Orange) → Second
- Medium (Blue/Green) → Third
- Low (Purple) → Last

---

## 📊 **Success Metrics**

### **User Engagement:**
- Click-through rate on insight actions
- Time spent on insights section
- Return visits to analytics page

### **Outcome Metrics:**
- Reduction in overdue audits
- Improvement in completion rates
- Increase in quality scores
- Faster response to pending approvals

### **User Feedback:**
- Survey: "How useful are the insights?" (1-5)
- Survey: "Do insights help you improve?" (Yes/No)
- Collect feedback on specific insights

---

## 🚀 **Quick Wins (Can Implement Immediately)**

### **For Auditor:**
1. ✅ Fix "Growth Opportunity" to use real category data
2. ✅ Calculate real consistency score (variance)
3. ✅ Add "Ready to Submit" insight for COMPLETED audits
4. ✅ Add "Due Soon" insight (3 days)

### **For Branch Manager:**
1. ✅ Fix "Team Development" to check actual team member rates
2. ✅ Add "Pending Approvals" urgent insight
3. ✅ Add "At-Risk Audits" (due in 24 hours)
4. ✅ Remove static insights, make all data-driven

### **For Admin:**
1. ✅ Add ANY insights (currently has none!)
2. ✅ System overdue rate alert
3. ✅ Approval bottleneck detection
4. ✅ Branch performance gap analysis

---

## ✅ **Acceptance Criteria**

For each insight:
- [ ] Uses 100% real data (no hardcoded values)
- [ ] Only shows when condition is true
- [ ] Provides actionable guidance
- [ ] Includes relevant data (counts, percentages, names)
- [ ] Has appropriate color/priority
- [ ] Links to relevant section (when applicable)
- [ ] Is tested with unit tests
- [ ] Has proper TypeScript types

---

**Ready to implement!** Start with quick wins, then build out comprehensive system. 🚀
