# Design System Implementation Guide

## ✅ Already Completed

### Screens with Modern Design Applied
1. **DashboardBranchManager.tsx** - ✅ Complete
   - Modern metric cards with gradient highlights
   - Clean 2-column pending approval grid
   - Professional audit history table
   - Survey names included
   - Clean pagination

2. **AuditSummary.tsx** - ✅ Complete
   - Approval/Rejection history section
   - Modern card layouts
   - Clean typography

## 🎯 Screens to Update

### Priority 1: High-Visibility Dashboards

#### **DashboardAdmin.tsx**
**Current Issues:**
- Mixed card styles (card-mobile, card-compact, card-interactive)
- Inconsistent spacing
- Old gradient patterns

**Apply:**
```tsx
// Header
<div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
      <p className="text-sm text-gray-600 mt-1">{branches.length} branches • {audits.length} audits</p>
    </div>
    <button className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors">
      + Create Survey
    </button>
  </div>

  // Quick Actions - Modern Grid
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
    <button className="bg-white border border-gray-200 rounded-lg p-4 text-left hover:shadow-md transition-shadow">
      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
        🏢
      </div>
      <p className="text-2xl font-bold text-gray-900">{branches.length}</p>
      <p className="text-sm text-gray-600">Branches</p>
    </button>
  </div>

  // Metrics - Full Width Cards
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div className="bg-gradient-to-r from-red-500 to-pink-500 rounded-lg p-5 text-white">
      <p className="text-sm font-medium uppercase tracking-wide">Overdue</p>
      <p className="text-4xl font-bold mt-2">{overdueCount}</p>
      <p className="text-sm mt-1">Urgent action required</p>
    </div>
  </div>
</div>
```

---

#### **DashboardAuditor.tsx**
**Current Issues:**
- Audit card designs need modernization
- Spacing inconsistencies

**Apply:**
```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
  // Metrics
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
        <ClockIcon className="w-6 h-6 text-blue-600" />
      </div>
      <p className="text-3xl font-bold text-gray-900">{inProgressCount}</p>
      <p className="text-sm text-gray-600 mt-1 uppercase tracking-wide">In Progress</p>
    </div>
  </div>

  // Audit List
  <div className="space-y-4">
    <h2 className="text-lg font-semibold text-gray-900">My Audits</h2>
    <div className="space-y-3">
      {audits.map(audit => (
        <div key={audit.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                {surveyName}
              </p>
              <h3 className="font-semibold text-gray-900">#{audit.id.slice(0, 8)}</h3>
              <p className="text-sm text-gray-600">{branchName}</p>
            </div>
            <StatusBadge status={audit.status} />
          </div>
          <button className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-lg transition-colors">
            Continue Audit
          </button>
        </div>
      ))}
    </div>
  </div>
</div>
```

---

#### **AuditReviewScreen.tsx**
**Apply:**
```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
  // Header
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Review Audit</h1>
      <p className="text-sm text-gray-600 mt-1">#{auditId.slice(0, 8)}</p>
    </div>
    <div className="flex gap-2">
      <button className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2.5 px-4 rounded-lg">
        Approve
      </button>
      <button className="bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-4 rounded-lg">
        Reject
      </button>
    </div>
  </div>

  // Audit Info Card
  <div className="bg-white border border-gray-200 rounded-lg p-5">
    <h2 className="text-lg font-semibold text-gray-900 mb-4">Audit Information</h2>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Survey</p>
        <p className="text-sm font-semibold text-gray-900">{surveyName}</p>
      </div>
    </div>
  </div>
</div>
```

---

### Priority 2: Management Screens

#### **ManageBranches.tsx**, **ManageUsers.tsx**, **ManageZones.tsx**

**Standard Pattern:**
```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
  // Header with Action
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Manage [Resource]</h1>
      <p className="text-sm text-gray-600 mt-1">{count} total</p>
    </div>
    <button className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-4 rounded-lg">
      + Add [Resource]
    </button>
  </div>

  // Table
  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Column
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        <tr className="hover:bg-gray-50">
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            Cell
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

---

### Priority 3: Forms & Settings

#### **Profile.tsx**, **ProfileSignature.tsx**, **Settings.tsx**

**Form Pattern:**
```tsx
<div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
  <div>
    <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
    <p className="text-sm text-gray-600 mt-1">Manage your account settings</p>
  </div>

  <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
    // Form Fields
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Full Name
      </label>
      <input 
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        type="text"
      />
    </div>

    // Actions
    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
      <button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2.5 px-4 rounded-lg">
        Cancel
      </button>
      <button className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-4 rounded-lg">
        Save Changes
      </button>
    </div>
  </div>
</div>
```

---

## 🔧 Component-Specific Patterns

### Status Badges
```tsx
// Success
<span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 ring-1 ring-green-600/20">
  ✓ Approved
</span>

// Warning/Pending
<span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 ring-1 ring-yellow-600/20">
  ⏳ Pending
</span>

// Error
<span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 ring-1 ring-red-600/20">
  ✗ Rejected
</span>
```

### Metric Cards
```tsx
// Alert/Priority Metric
<div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg p-5 text-white">
  <p className="text-sm font-medium uppercase tracking-wide opacity-90">Needs Attention</p>
  <p className="text-4xl font-bold mt-2">{count}</p>
  <p className="text-sm mt-1 opacity-90">Requiring action</p>
</div>

// Standard Metric
<div className="bg-white border border-gray-200 rounded-lg p-5">
  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
    <Icon className="w-6 h-6 text-blue-600" />
  </div>
  <p className="text-3xl font-bold text-gray-900">{count}</p>
  <p className="text-sm text-gray-600 mt-1 uppercase tracking-wide">Label</p>
</div>
```

### Pagination
```tsx
<div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
  <div className="flex gap-2">
    <button 
      disabled={page === 1}
      className="px-4 py-2 border border-gray-300 bg-white rounded-lg text-sm font-medium disabled:opacity-40"
    >
      ← Previous
    </button>
    <button 
      disabled={page === totalPages}
      className="px-4 py-2 border border-gray-300 bg-white rounded-lg text-sm font-medium disabled:opacity-40"
    >
      Next →
    </button>
  </div>
  <span className="text-sm text-gray-600">
    Page <span className="font-medium text-gray-900">{page}</span> of <span className="font-medium text-gray-900">{totalPages}</span>
  </span>
</div>
```

---

## 📋 Checklist for Each Screen

- [ ] Update page container: `max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6`
- [ ] Apply typography hierarchy (text-2xl, text-lg, text-sm, text-xs)
- [ ] Update card styles: `bg-white border border-gray-200 rounded-lg p-4`
- [ ] Update buttons: `bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors`
- [ ] Update tables: `px-6 py-4` cells, `bg-gray-50` headers, `hover:bg-gray-50` rows
- [ ] Add uppercase tracking labels: `text-xs font-medium text-gray-500 uppercase tracking-wide`
- [ ] Use consistent gaps: `gap-3`, `gap-4`, `space-y-3`, `space-y-4`, `space-y-6`
- [ ] Test functionality - ensure no features broken
- [ ] Test responsive behavior - mobile through desktop

---

## 🎨 Quick Reference

**Spacing:** gap-3 (12px), gap-4 (16px), space-y-4 (16px), space-y-6 (24px), p-4 (mobile), p-5 (desktop)

**Typography:** text-2xl (titles), text-lg (sections), text-sm (body), text-xs (labels)

**Colors:** primary-600 (actions), gray-50 (backgrounds), gray-200 (borders), gray-600 (text), gray-900 (headings)

**Borders:** rounded-lg (8px standard), border (1px), border-2 (2px alerts)

**Hover:** hover:bg-gray-50 (rows), hover:shadow-md (cards), hover:bg-primary-700 (buttons)
