# Two-Column Login Layout - Manual Implementation Instructions

Follow these steps **in order** to implement the two-column desktop layout for the LoginScreen:

## Step 1: Remove Parallax State Variables

In `apps/web/src/screens/LoginScreen.tsx`, **delete lines 59-62**:

```typescript
  // Parallax effect state
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [gyroPos, setGyroPos] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
```

After deletion, line 63 should become the new line 59.

---

## Step 2: Remove Mouse Movement useEffect

**Delete the entire mouse movement tracking useEffect** (approximately lines 509-524, but verify by searching for the comment `// Mouse movement tracking for desktop parallax`):

```typescript
  // Mouse movement tracking for desktop parallax
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const centerX = rect.width / 2
        const centerY = rect.height / 2
        const x = (e.clientX - rect.left - centerX) / centerX
        const y = (e.clientY - rect.top - centerY) / centerY
        setMousePos({ x: x * 50, y: y * 50 }) // Scale movement
      }
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])
```

---

## Step 3: Remove Gyroscope useEffect

**Delete the entire gyroscope tracking useEffect** (search for the comment `// Gyroscope tracking for mobile parallax`):

```typescript
  // Gyroscope tracking for mobile parallax
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta !== null && e.gamma !== null) {
        // ... (entire function body)
      }
    }
    // ... (rest of the useEffect)
  }, [])
```

---

## Step 4: Remove Parallax Calculation Lines

**Delete the parallax offset calculation lines** (search for `// Calculate parallax offset`):

```typescript
  // Calculate parallax offset (use gyroscope on mobile, mouse on desktop)
  const parallaxX = window.innerWidth <= 768 ? gyroPos.x : mousePos.x
  const parallaxY = window.innerWidth <= 768 ? gyroPos.y : mousePos.y
```

---

## Step 5: Replace the Return Statement

**Find the `return (` line** (should be around line 563 after the deletions above).

**Delete everything from `return (` down to and including the closing `}` just before `export default LoginScreen`** (the entire JSX return block, approximately 600 lines).

**Replace it with the code from `LOGINSCREEN_REPLACEMENT.txt`** (the file I created in the repo root).

---

## Verification

After making these changes:

1. Save the file
2. The file should have **NO** TypeScript errors
3. All authentication logic remains intact
4. The layout will show:
   - **Mobile**: Single column with logo, form, and footer stacked vertically
   - **Desktop (md+)**: Two columns - left has the form, right has the hero panel

---

## What Changed

### Removed:
- Dark space theme with parallax stars
- Mouse and gyroscope tracking
- All parallax animation code
- Glass morphism effects

### Added:
- Clean light theme with subtle gradient background
- Two-column grid layout (responsive)
- Hero panel on desktop (hidden on mobile) with:
  - "Audit. Prove. Resolve." tagline
  - Product description
  - Three key benefits
  - Feature badges at bottom
- Wider card (`max-w-5xl` instead of `max-w-md`)

### Preserved:
- All authentication handlers (`handleLogin`, `handleRegister`, `handleForgotPassword`)
- All form validation and error handling
- Lockout mechanism
- Remember me toggle
- Dev quick access buttons
- **All Playwright selectors** (inputs, buttons remain unchanged)
- All state management
