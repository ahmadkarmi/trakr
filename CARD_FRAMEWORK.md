# Card Framework - Trakr Design System

## Overview
All cards across the Trakr application follow a consistent framework with variations to meet specific functional requirements.

---

## Base Card Structure

### Container
```tsx
<div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
```
- White background with subtle border
- Rounded corners for modern feel
- `overflow-hidden` ensures content respects boundaries

### Header (Optional)
```tsx
<div className="px-4 sm:px-6 py-4 border-b border-gray-200">
  <h3 className="text-lg font-medium text-gray-900">{title}</h3>
</div>
```
- Responsive padding (16px mobile, 24px desktop)
- Bottom border to separate from content
- Consistent title styling

### Body
```tsx
<div className="p-4 sm:p-6">
  {/* Content */}
</div>
```
- Responsive padding matching header
- Contains the main card content

---

## Card Variations

### 1. Metric Card (Small Stats)
**Use Case:** Single metric display with icon

```tsx
<div className="bg-white border border-gray-200 rounded-lg p-5">
  {/* Icon */}
  <div className="w-10 h-10 bg-{color}-100 rounded-lg flex items-center justify-center mb-3">
    <Icon className="w-6 h-6 text-{color}-600" />
  </div>
  
  {/* Value */}
  <p className="text-3xl font-bold text-gray-900">{value}</p>
  
  {/* Label */}
  <p className="text-sm text-gray-600 mt-1">{label}</p>
  
  {/* Optional Sublabel */}
  <p className="text-xs text-gray-500 mt-1">{sublabel}</p>
</div>
```

**Features:**
- Padding: `p-5` (20px)
- Icon: 40x40px with colored background
- Value: Large (36px) bold text
- Label: Small (14px) description
- No header/body separation (compact design)

---

### 2. Alert/Urgent Metric Card
**Use Case:** Highlight critical metrics requiring attention

```tsx
{value > 0 ? (
  <div className="col-span-2 sm:col-span-3 lg:col-span-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg p-5 text-white">
    <p className="text-sm font-medium opacity-90">{label}</p>
    <p className="text-4xl font-bold mt-2">{value}</p>
    <p className="text-sm mt-1 opacity-90">{description}</p>
  </div>
) : (
  /* Standard metric card */
)}
```

**Features:**
- Gradient background for urgency
- White text with opacity
- Can span multiple columns
- Conditional rendering based on value

---

### 3. Table Card
**Use Case:** Display tabular data with headers

```tsx
<div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
  {/* Header with optional meta */}
  <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
    <h3 className="text-lg font-medium text-gray-900">{title}</h3>
    <span className="text-xs text-gray-500">{meta}</span>
  </div>
  
  {/* Body */}
  <div className="p-4 sm:p-6">
    {isEmpty ? (
      <p className="text-gray-500 text-center py-8">{emptyMessage}</p>
    ) : (
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {columnName}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm text-gray-900">
                  {item.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
</div>
```

**Features:**
- Header with title and optional metadata
- Responsive table with horizontal scroll on mobile
- Empty state handling
- Row hover effects
- Proper table padding (16px)
- Uppercase column headers

---

### 4. List Card
**Use Case:** Display list of items or activity feed

```tsx
<div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
  {/* Header */}
  <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
    <h3 className="text-lg font-medium text-gray-900">{title}</h3>
  </div>
  
  {/* Body */}
  <div className="p-4 sm:p-6">
    {isEmpty ? (
      <p className="text-gray-500 text-center py-8">{emptyMessage}</p>
    ) : (
      <ul className="space-y-3">
        {items.map(item => (
          <li 
            key={item.id} 
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4 py-2 border-b border-gray-100 last:border-0"
          >
            <span className="text-sm text-gray-900 font-medium">{item.title}</span>
            <span className="text-xs text-gray-500">{item.subtitle}</span>
            <span className="text-xs text-gray-400 whitespace-nowrap">{item.meta}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
</div>
```

**Features:**
- Vertical spacing between items
- Bottom borders between items (except last)
- Responsive layout (stack on mobile)
- Empty state handling
- Semantic HTML (`ul`/`li`)

---

### 5. Complex Interactive Card
**Use Case:** Cards with filters, search, and dynamic content

```tsx
<div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
  {/* Header with controls */}
  <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      {/* Optional controls (toggles, filters, etc.) */}
      <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
        {controls}
      </div>
    </div>
  </div>
  
  {/* Body with filters/search */}
  <div className="p-4 sm:p-6">
    <div className="mb-4 space-y-3">
      {/* Search, filters, etc. */}
    </div>
    
    {/* Main content */}
    {content}
  </div>
</div>
```

**Features:**
- Header with integrated controls
- Separate filter section
- Consistent spacing
- Responsive layout

---

## Grid Layouts

### Metric Grid (6 columns desktop)
```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
  {/* Metric cards */}
</div>
```
- Mobile: 2 columns
- Tablet: 3 columns
- Desktop: 6 columns
- 16px gap between cards

### Two-Column Layout
```tsx
<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
  {/* Two cards side by side on large screens */}
</div>
```
- Mobile: Single column
- Desktop (1280px+): Two columns
- 24px gap between cards

---

## Spacing Standards

### Padding
- **Card padding:** `p-5` (20px) for metric cards
- **Section padding:** `p-4 sm:p-6` (16px mobile, 24px desktop)
- **Header padding:** `px-4 sm:px-6 py-4` (horizontal: 16-24px, vertical: 16px)

### Gaps
- **Between cards:** `gap-4` (16px) or `gap-6` (24px)
- **Between elements:** `space-y-2` or `space-y-3` (8-12px)
- **Within cards:** `mb-3` (12px) for icon/content separation

---

## Empty States

All cards with dynamic content must handle empty states:

```tsx
{isEmpty ? (
  <p className="text-gray-500 text-center py-8">{emptyMessage}</p>
) : (
  {/* Content */}
)}
```

**Standards:**
- Centered text
- Gray color (`text-gray-500`)
- Vertical padding (`py-8`)
- Descriptive message

---

## Color Patterns

### Backgrounds
- **Default:** `bg-white`
- **Alert/Urgent:** `bg-gradient-to-r from-red-500 to-pink-500`
- **Neutral:** `bg-gray-50` (for table headers)

### Icon Backgrounds
- **Primary:** `bg-primary-100` + `text-primary-600`
- **Success:** `bg-green-100` + `text-green-600`
- **Warning:** `bg-orange-100` + `text-orange-600`
- **Info:** `bg-blue-100` + `text-blue-600`
- **Neutral:** `bg-indigo-100` + `text-indigo-600`

### Text
- **Primary:** `text-gray-900`
- **Secondary:** `text-gray-600`
- **Tertiary:** `text-gray-500`
- **Meta:** `text-gray-400`

---

## Mobile-First Principles

1. **Responsive Padding:** Use `p-4 sm:p-6` for breathing room
2. **Stacking:** Use `flex-col sm:flex-row` for mobile-friendly layouts
3. **Full Width:** Inputs and buttons go full-width on mobile
4. **Touch Targets:** Minimum 44px height for interactive elements
5. **Horizontal Scroll:** Tables can scroll horizontally on mobile with `-mx-4 sm:mx-0`

---

## Accessibility

- Semantic HTML (`header`, `main`, `ul`, `table`)
- Proper heading hierarchy
- `aria-label` for icon-only buttons
- Sufficient color contrast
- Focus states on interactive elements

---

## Examples in Production

### Metric Cards
- Overdue count
- Due This Week
- Completion Rate
- In Progress
- On-time Rate
- Branches Coverage

### Table Cards
- Weekly Zone Coverage

### List Cards
- Recent Activity

### Complex Cards
- This Week's Audits (with filters and search)

---

## Best Practices

1. ✅ **Consistency:** Use the base framework for all new cards
2. ✅ **Variations:** Adapt only what's necessary for the card's function
3. ✅ **Spacing:** Follow the spacing standards religiously
4. ✅ **Empty States:** Always handle empty/loading states
5. ✅ **Responsive:** Test on mobile first, then desktop
6. ✅ **Performance:** Use CSS transforms for animations
7. ✅ **Semantics:** Use appropriate HTML elements

---

## Migration Checklist

When updating existing cards:

- [ ] Replace `card` class with explicit styling
- [ ] Update padding to `px-4 sm:px-6 py-4` for headers
- [ ] Update body padding to `p-4 sm:p-6`
- [ ] Add `overflow-hidden` to container
- [ ] Make header responsive with `flex-col sm:flex-row`
- [ ] Add empty state handling
- [ ] Test on mobile and desktop
- [ ] Verify spacing matches standards

---

*Last Updated: 2025-10-04*
*Version: 1.0*
