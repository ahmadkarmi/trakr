# Trakr Design System

## Overview

Trakr uses a unified design system across web and mobile platforms:
- **Web**: Tailwind CSS with custom components
- **Mobile**: UI Kitten with Eva Design System
- **Shared**: TypeScript interfaces and utilities

## 🎨 Color Palette

### Primary Colors
```css
Primary 500: #3B82F6 (Blue)
Primary 600: #2563EB (Darker Blue)
Primary 700: #1D4ED8 (Dark Blue)
```

### Semantic Colors
```css
Success: #22C55E (Green)
Warning: #F59E0B (Orange)
Danger: #EF4444 (Red)
Info: #3B82F6 (Blue)
```

### Neutral Colors
```css
Gray 50: #F9FAFB (Background)
Gray 100: #F3F4F6 (Light Gray)
Gray 200: #E5E7EB (Border)
Gray 500: #6B7280 (Text Secondary)
Gray 900: #111827 (Text Primary)
```

## 📱 Mobile Components (UI Kitten)

### Typography
```tsx
<Text category="h1">Main Heading</Text>
<Text category="h6">Section Heading</Text>
<Text category="p1">Body Text</Text>
<Text category="c1" appearance="hint">Caption</Text>
```

### Buttons
```tsx
<Button status="primary">Primary Action</Button>
<Button appearance="outline">Secondary Action</Button>
<Button status="danger">Destructive Action</Button>
```

### Cards
```tsx
<Card style={{ margin: 16 }}>
  <Text category="h6">Card Title</Text>
  <Text category="p2" appearance="hint">Card content</Text>
</Card>
```

### Layouts
```tsx
<Layout level="1" style={{ flex: 1 }}>
  <Layout level="2" style={{ padding: 16 }}>
    {/* Content */}
  </Layout>
</Layout>
```

## 💻 Web Components (Tailwind CSS)

### Modern Design System (2025)

#### Typography Hierarchy
```tsx
{/* Page Titles */}
<h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

{/* Section Titles */}
<h2 className="text-lg font-semibold text-gray-900">Section Title</h2>

{/* Subsection Titles */}
<h3 className="text-base font-semibold text-gray-900">Subsection</h3>

{/* Body Text */}
<p className="text-sm text-gray-600">Regular body text</p>

{/* Labels - Uppercase with tracking */}
<p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Label</p>

{/* Captions */}
<span className="text-xs text-gray-600">Caption or helper text</span>
```

#### Buttons
```tsx
{/* Primary Action */}
<button className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors">
  Primary
</button>

{/* Secondary Action */}
<button className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2.5 px-4 rounded-lg transition-colors">
  Secondary
</button>

{/* Destructive Action */}
<button className="bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors">
  Delete
</button>

{/* Alert Action (Yellow/Orange) */}
<button className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors">
  Review
</button>
```

#### Cards - Modern Design
```tsx
{/* Standard Card */}
<div className="bg-white border border-gray-200 rounded-lg p-4">
  <h3 className="font-semibold text-gray-900 mb-2">Card Title</h3>
  <p className="text-sm text-gray-600">Card content</p>
</div>

{/* Elevated Card (with hover) */}
<div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
  <h3 className="font-semibold text-gray-900 mb-2">Hoverable Card</h3>
</div>

{/* Alert Card (Warning/Pending) */}
<div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg p-4">
  <h3 className="font-semibold text-gray-900 mb-2">Alert Card</h3>
</div>

{/* List Item Card (no spacing between) */}
<div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
  <div className="divide-y divide-gray-200">
    <div className="p-4 hover:bg-gray-50 transition-colors">Item 1</div>
    <div className="p-4 hover:bg-gray-50 transition-colors">Item 2</div>
  </div>
</div>
```

#### Tables - Desktop
```tsx
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
```

#### Forms
```tsx
{/* Input Field */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Label
  </label>
  <input 
    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
    type="text"
  />
</div>

{/* Select Dropdown */}
<select className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-sm font-medium">
  <option>Option 1</option>
</select>
```

#### Badges & Status
```tsx
{/* Success */}
<span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 ring-1 ring-green-600/20">
  Approved
</span>

{/* Warning */}
<span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 ring-1 ring-yellow-600/20">
  Pending
</span>

{/* Error */}
<span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 ring-1 ring-red-600/20">
  Rejected
</span>
```

## 🔧 Shared Components

### Button Variants
- `primary`: Main call-to-action
- `secondary`: Secondary actions
- `outline`: Subtle actions
- `danger`: Destructive actions

### Text Variants
- `heading`: Main headings
- `subheading`: Section headings
- `body`: Regular text
- `caption`: Small text
- `label`: Form labels

### Card Variants
- `default`: Standard card
- `elevated`: Card with shadow
- `outlined`: Card with border

## 📐 Spacing System (2025 Modern)

### Web Layout Spacing
```tsx
{/* Page Container */}
<div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
  
  {/* Section Spacing */}
  <div className="space-y-4">
    
    {/* Card Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      
      {/* Card Padding */}
      <div className="p-4 sm:p-5">
        
        {/* Internal Content Spacing */}
        <div className="space-y-3">
          {/* Content */}
        </div>
        
      </div>
    </div>
  </div>
</div>
```

### Standard Spacing Values
```css
gap-3     /* 12px - Between items in grids/lists */
gap-4     /* 16px - Between cards in grids */
space-y-3 /* 12px - Between list items */
space-y-4 /* 16px - Between sections */
space-y-6 /* 24px - Between major sections */
p-4       /* 16px - Card padding (mobile) */
p-5       /* 20px - Card padding (desktop) */
px-6 py-4 /* 24px x 16px - Table cell padding */
mb-3      /* 12px - Below headers */
mb-4      /* 16px - Below major elements */
```

### Responsive Patterns
```tsx
{/* Mobile-first spacing */}
<div className="space-y-3 sm:space-y-4 lg:space-y-6">

{/* Responsive padding */}
<div className="p-4 sm:p-5 lg:p-6">

{/* Responsive grid gaps */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
```

## 🎯 Usage Guidelines

### Do's
✅ Use semantic color names (primary, success, danger)
✅ Follow consistent spacing patterns
✅ Use appropriate text categories/classes
✅ Maintain accessibility standards
✅ Test on both platforms

### Don'ts
❌ Use hardcoded colors
❌ Mix different spacing systems
❌ Override component styles unnecessarily
❌ Ignore accessibility guidelines
❌ Create platform-specific inconsistencies

## 🚀 Implementation Status

### Mobile (UI Kitten)
- ✅ Login Screen
- ✅ Dashboard Header
- ✅ Auditor Dashboard
- ✅ Branch Manager Dashboard
- ✅ Admin Dashboard
- ✅ Loading States
- 🚧 Form Components
- 🚧 List Components

### Web (Tailwind CSS)
- ✅ Login Screen
- ✅ Dashboard Layouts
- ✅ Navigation Components
- ✅ Card Components
- ✅ Button System
- 🚧 Form Components
- 🚧 Modal Components

### Shared
- ✅ TypeScript Interfaces
- ✅ Utility Functions
- ✅ Mock Data Services
- ✅ Component Wrappers
- 🚧 Form Validation
- 🚧 Theme Utilities

## 📚 Resources

- [UI Kitten Documentation](https://akveo.github.io/react-native-ui-kitten/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Eva Design System](https://eva.design/)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
