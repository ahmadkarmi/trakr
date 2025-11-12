# 🔘 Button System Audit & Fix

## Problem Identified

**Black buttons (btn-secondary)** appear throughout the app and look heavy/inconsistent.

Current `btn-secondary`:
```css
bg-gray-900 /* Dark black - too heavy */
```

---

## 🎯 New Button System

### **Primary Actions** (Most important)
```tsx
className="btn btn-primary"
```
- **Use for:** Save, Submit, Create, Confirm
- **Style:** Blue gradient with glow
- **Example:** "Create Survey", "Save Changes"

### **Secondary Actions** (Important but not primary)
```tsx
className="btn btn-outline"
```
- **Use for:** Cancel, Back, Alternative actions
- **Style:** White with border
- **Example:** "Cancel", "Go Back"

### **Destructive Actions**
```tsx
className="btn btn-danger"
```
- **Use for:** Delete, Remove, Reject
- **Style:** Red gradient with glow
- **Example:** "Delete", "Remove User"

### **Tertiary/Ghost Actions** (Minimal)
```tsx
className="btn btn-ghost"
```
- **Use for:** Dismiss, Close, Minimal actions
- **Style:** No background, subtle hover
- **Example:** "Dismiss", "Skip"

### **Link-style Actions**
```tsx
className="btn btn-link"
```
- **Use for:** In-text actions, view more
- **Style:** Blue underline on hover
- **Example:** "View Details", "Learn More"

---

## ❌ Remove btn-secondary Entirely

**Problem:** Black buttons are too heavy and don't fit the design system.

**Solution:** Replace all `btn-secondary` with appropriate alternatives:
- Cancel buttons → `btn-outline`
- Duplicate actions → `btn-outline`
- Secondary CTAs → `btn-outline`

---

## 🔍 Button Audit Results

### **Screens with btn-secondary (Black Buttons):**

1. **AuditReviewScreen.tsx** (2 instances)
   - Line 675: Cancel button (Approval dialog)
   - Line 704: Cancel button (Rejection dialog)
   - **Fix:** Change to `btn-outline`

2. **AuditWizard.tsx** (1 instance)
   - Line 866: Save & Exit button
   - **Fix:** Change to `btn-outline`

3. **ManageSurveyTemplates.tsx** (1+ instances)
   - Line 201: Duplicate button
   - **Fix:** Change to `btn-outline`

4. **Notifications.tsx** (2 instances)
   - Mark all as read buttons
   - **Fix:** Already using btn-secondary, change to `btn-outline`

---

## ✅ Updated Button System CSS

### Remove btn-secondary, Add btn-muted for rare cases:

```css
/* PRIMARY - Main actions */
.btn-primary { 
  @apply bg-gradient-to-r from-primary-600 to-primary-700 
         text-white 
         hover:from-primary-700 hover:to-primary-800 
         hover:shadow-lg hover:shadow-primary-500/30 
         hover:-translate-y-0.5 
         focus:ring-primary-600; 
}

/* OUTLINE - Secondary actions, Cancel */
.btn-outline { 
  @apply border border-gray-300 
         text-gray-700 
         bg-white 
         hover:bg-gray-50 
         hover:border-gray-400
         hover:shadow-md 
         hover:-translate-y-0.5 
         focus:ring-primary-600; 
}

/* DANGER - Destructive actions */
.btn-danger { 
  @apply bg-gradient-to-r from-danger-600 to-danger-700 
         text-white 
         hover:from-danger-700 hover:to-danger-800 
         hover:shadow-lg hover:shadow-danger-500/30 
         hover:-translate-y-0.5 
         focus:ring-danger-600; 
}

/* GHOST - Minimal actions */
.btn-ghost { 
  @apply text-gray-600 
         hover:bg-gray-100 
         hover:text-gray-900
         hover:shadow-sm; 
}

/* LINK - Text-style actions */
.btn-link { 
  @apply text-primary-600 
         hover:text-primary-700 
         hover:underline; 
}

/* MUTED - Very rare secondary (if absolutely needed) */
.btn-muted { 
  @apply bg-gray-100 
         text-gray-700 
         hover:bg-gray-200 
         hover:shadow-sm
         hover:-translate-y-0.5
         focus:ring-gray-400; 
}
```

---

## 📋 Replacement Guide

### **Cancel Buttons:**
```tsx
// ❌ Before
<button className="btn btn-secondary">Cancel</button>

// ✅ After
<button className="btn btn-outline">Cancel</button>
```

### **Duplicate/Alternative Actions:**
```tsx
// ❌ Before
<button className="btn btn-secondary">Duplicate</button>

// ✅ After
<button className="btn btn-outline">Duplicate</button>
```

### **Mark All Actions:**
```tsx
// ❌ Before
<button className="btn-secondary">Mark all as read</button>

// ✅ After
<button className="btn btn-outline">Mark all as read</button>
```

### **Save & Exit (Non-primary):**
```tsx
// ❌ Before
<button className="btn btn-secondary">Save & Exit</button>

// ✅ After
<button className="btn btn-outline">Save & Exit</button>
```

---

## 🎨 Visual Hierarchy

```
┌─────────────────────────────────────┐
│                                     │
│  [Create Survey]  [Cancel]          │
│   btn-primary      btn-outline      │
│   (Blue gradient)  (White/border)   │
│                                     │
└─────────────────────────────────────┘

Correct visual weight:
- Primary: Bold, prominent (gradient + shadow)
- Cancel: Subtle, less prominent (outline)
- Destructive: Red, clear warning (gradient)
```

---

## 🔧 Implementation Plan

### **Phase 1: Update CSS** (Remove btn-secondary)
```css
/* DELETE THIS: */
.btn-secondary { @apply bg-gray-900 text-white ... }

/* OPTIONAL ADD: */
.btn-muted { @apply bg-gray-100 text-gray-700 ... }
```

### **Phase 2: Update All Files**
1. AuditReviewScreen.tsx - 2 buttons
2. AuditWizard.tsx - 1 button
3. ManageSurveyTemplates.tsx - 1+ buttons
4. Notifications.tsx - 2 buttons
5. Any other files with btn-secondary

### **Phase 3: Verify**
- Check all pages for visual consistency
- Ensure no black buttons remain
- Confirm proper visual hierarchy

---

## ✅ Expected Results

### **Before:**
```
[Create]    [Cancel]
(Blue)      (BLACK)  ← Too heavy!
```

### **After:**
```
[Create]    [Cancel]
(Blue)      (Border) ← Perfect hierarchy!
```

---

## 📊 Button Usage Matrix

| Action Type | Button Class | Example |
|-------------|--------------|---------|
| **Save/Create/Submit** | `btn-primary` | "Create Survey" |
| **Cancel/Back** | `btn-outline` | "Cancel" |
| **Delete/Remove** | `btn-danger` | "Delete User" |
| **Dismiss/Close** | `btn-ghost` | "Dismiss" |
| **View/Learn More** | `btn-link` | "Learn More" |
| **Duplicate/Copy** | `btn-outline` | "Duplicate" |
| **Mark as Read** | `btn-outline` | "Mark all" |
| **Alternative Save** | `btn-outline` | "Save & Exit" |

---

## 🚫 Never Use

- ❌ `btn-secondary` (too heavy, inconsistent)
- ❌ `bg-gray-900` (black backgrounds)
- ❌ `bg-black` (pure black)
- ❌ Inline gray backgrounds without system

---

## ✨ Benefits

1. ✅ **Clear hierarchy** - Easy to identify primary actions
2. ✅ **Consistent system** - Same button = same meaning
3. ✅ **Better UX** - Users know what's important
4. ✅ **Lighter design** - No heavy black buttons
5. ✅ **Accessible** - Good contrast, clear focus states
