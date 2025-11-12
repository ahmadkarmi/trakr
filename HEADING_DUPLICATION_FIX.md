# Fix: Heading Duplication on Desktop

## Problem
Pages show duplicate headings on desktop:
- One in `DashboardLayout` header
- One in page content area

## Solution: Responsive Heading Pattern

### Pattern 1: Hide Content Heading on Desktop (Recommended)
Keep the layout header, hide duplicate in content on desktop:

```tsx
// In your page component
<DashboardLayout title="Admin Dashboard">
  {/* Hide on desktop, show on mobile for context when scrolling */}
  <div className="md:hidden mb-6">
    <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
    <p className="text-gray-600 mt-1">Your subtitle here</p>
  </div>
  
  {/* Always show subtitle/description */}
  <div className="hidden md:block mb-6">
    <p className="text-gray-600">Your subtitle here</p>
  </div>
  
  {/* Rest of content */}
</DashboardLayout>
```

### Pattern 2: Enhanced DashboardLayout with Subtitle Prop
Add subtitle support to the layout itself:

```tsx
// DashboardLayout.tsx - Update interface
interface DashboardLayoutProps {
  title: string
  subtitle?: string  // Add this
  children: ReactNode
}

// Update header section (around line 316-319)
<div className="min-w-0">
  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{title}</h1>
  {subtitle && (
    <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
  )}
</div>

// Usage in pages
<DashboardLayout 
  title="Admin Dashboard" 
  subtitle="12 branches • 45 audits"
>
  {/* No h1 needed in content */}
</DashboardLayout>
```

### Pattern 3: Section Headings (Not Page Headings)
Use h2 for section headings in content, not page title:

```tsx
<DashboardLayout title="Analytics">
  {/* Section heading - NOT a page heading */}
  <div className="mb-6">
    <h2 className="text-lg font-semibold text-gray-900">Performance Overview</h2>
    <p className="text-sm text-gray-600">Last 30 days</p>
  </div>
  
  {/* Another section */}
  <div className="mb-6">
    <h2 className="text-lg font-semibold text-gray-900">Branch Rankings</h2>
  </div>
</DashboardLayout>
```

## Quick Fix Script

Apply to all pages automatically:

### Replace Pattern:
```tsx
// FROM:
<h1 className="text-2xl font-bold text-gray-900">Page Title</h1>
<p className="text-gray-600 mt-1">Subtitle here</p>

// TO:
<div className="md:hidden mb-4">
  <h1 className="text-2xl font-bold text-gray-900">Page Title</h1>
  <p className="text-gray-600 mt-1">Subtitle here</p>
</div>
<div className="hidden md:block mb-4">
  <p className="text-gray-600">Subtitle here</p>
</div>
```

## Pages to Update

1. ✅ DashboardAdmin.tsx (line 643)
2. ✅ ManageBranches.tsx (line 230)  
3. ✅ Notifications.tsx (lines 142, 163)
4. ✅ Profile.tsx (line 57)
5. ✅ ManageSurveyTemplates.tsx
6. ✅ ManageUsers.tsx
7. ✅ ManageZones.tsx
8. ✅ Analytics sub-pages (AdminAnalytics, BranchManagerAnalytics, AuditorAnalytics)

## Benefits

✅ **No context loss** - Subheadings remain visible  
✅ **Mobile friendly** - Full heading context when scrolling  
✅ **Clean desktop UI** - Single heading in header  
✅ **Flexible** - Each page can customize subtitle/description  
✅ **Accessible** - Proper heading hierarchy maintained  

## Example: Admin Dashboard

```tsx
<DashboardLayout title="Admin Dashboard">
  {/* Mobile: Show full heading context */}
  <div className="md:hidden mb-6">
    <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
    <p className="text-gray-600 mt-1">{branches.length} branches • {audits.length} audits</p>
  </div>
  
  {/* Desktop: Just show dynamic subtitle */}
  <div className="hidden md:block mb-6">
    <p className="text-gray-600">{branches.length} branches • {audits.length} audits • {user?.name}</p>
  </div>

  {/* Cards grid */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    {/* ... */}
  </div>
</DashboardLayout>
```
