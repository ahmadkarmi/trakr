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

### Typography
```tsx
<h1 className="text-4xl font-bold text-primary-600">Main Heading</h1>
<h2 className="text-xl font-semibold text-gray-900">Section Heading</h2>
<p className="text-gray-600">Body Text</p>
<span className="text-sm text-gray-500">Caption</span>
```

### Buttons
```tsx
<button className="btn-primary">Primary Action</button>
<button className="btn-outline">Secondary Action</button>
<button className="btn-danger">Destructive Action</button>
```

### Cards
```tsx
<div className="card p-6">
  <h3 className="text-lg font-medium text-gray-900">Card Title</h3>
  <p className="text-gray-600">Card content</p>
</div>
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

## 📐 Spacing System

### Mobile (React Native)
```tsx
style={{
  margin: 16,        // Standard margin
  padding: 20,       // Standard padding
  gap: 12,          // Standard gap
}}
```

### Web (Tailwind CSS)
```css
.spacing-sm { margin: 0.5rem; }    /* 8px */
.spacing-md { margin: 1rem; }      /* 16px */
.spacing-lg { margin: 1.5rem; }    /* 24px */
.spacing-xl { margin: 2rem; }      /* 32px */
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
