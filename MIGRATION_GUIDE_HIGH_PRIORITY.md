# High Priority Fixes Migration Guide

## Overview

This guide helps migrate from unsafe logging and storage patterns to safe utilities.

---

## 1. Logger Migration

### Before (Unsafe)
```typescript
console.log('[Context] User data:', user);
console.error('API Error:', error);
console.warn('Rate limit approaching');
```

### After (Safe)
```typescript
import { logger } from '@/utils/logger';

logger.debug('User data loaded', { context: 'Context', data: user });
logger.error('API request failed', error, { context: 'API' });
logger.warn('Rate limit approaching', { context: 'RateLimit' });
```

### Benefits
- ✅ No logs in production (except errors/warnings)
- ✅ Structured logging with context
- ✅ Ready for external services (Sentry)
- ✅ Performance tracking built-in

---

## 2. Safe Storage Migration

### Before (Unsafe - crashes in Safari private mode)
```typescript
localStorage.setItem('key', 'value');
const data = localStorage.getItem('key');
localStorage.removeItem('key');
```

### After (Safe - handles all edge cases)
```typescript
import { safeLocalStorage } from '@/utils/safeStorage';

safeLocalStorage.setItem('key', 'value');
const data = safeLocalStorage.getItem('key');
safeLocalStorage.removeItem('key');
```

### For Objects
```typescript
// Before
localStorage.setItem('user', JSON.stringify(user));
const user = JSON.parse(localStorage.getItem('user') || '{}');

// After
safeLocalStorage.setObject('user', user);
const user = safeLocalStorage.getObject<User>('user', defaultUser);
```

---

## 3. Files to Update (Priority Order)

### High Impact Files (Update First)

1. **apps/web/src/contexts/OrganizationContext.tsx**
   - 10 console statements
   - 9 localStorage accesses
   - Critical for app functionality

2. **apps/web/src/utils/backfillNotifications.ts**
   - 18 console statements
   - Performance logging needed

3. **apps/web/src/utils/notifications.ts**
   - 14 console statements
   - 5 localStorage accesses

4. **apps/web/src/hooks/usePerformanceMonitoring.ts**
   - 13 console statements
   - Perfect candidate for logger.perf()

5. **apps/web/src/utils/errorHandler.ts**
   - 4 localStorage accesses
   - Critical error handling

---

## 4. Automated Find & Replace

### Find Console Statements
```bash
# Find all console.log calls
grep -rn "console\.log" apps/web/src --exclude-dir=node_modules

# Find all console.error calls
grep -rn "console\.error" apps/web/src --exclude-dir=node_modules

# Find all console.warn calls
grep -rn "console\.warn" apps/web/src --exclude-dir=node_modules
```

### Find localStorage Calls
```bash
# Find all localStorage.setItem
grep -rn "localStorage\.setItem" apps/web/src --exclude-dir=node_modules

# Find all localStorage.getItem
grep -rn "localStorage\.getItem" apps/web/src --exclude-dir=node_modules

# Find all sessionStorage calls
grep -rn "sessionStorage\." apps/web/src --exclude-dir=node_modules
```

---

## 5. Quick Migration Script

Create `scripts/migrate-logging.js`:

```javascript
const fs = require('fs');
const path = require('path');

// Files to migrate (add more as needed)
const filesToMigrate = [
  'apps/web/src/contexts/OrganizationContext.tsx',
  'apps/web/src/utils/notifications.ts',
  'apps/web/src/utils/errorHandler.ts',
];

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;

  // Add import if not present
  if (!content.includes("from '@/utils/logger'") && 
      !content.includes("from './logger'")) {
    // Add import after other imports
    const lastImportIndex = content.lastIndexOf('import ');
    const endOfLine = content.indexOf('\n', lastImportIndex);
    content = content.slice(0, endOfLine + 1) + 
              "import { logger } from '@/utils/logger';\n" +
              content.slice(endOfLine + 1);
    changes++;
  }

  // Replace console.log
  content = content.replace(/console\.log\((.*?)\)/g, (match, args) => {
    changes++;
    return `logger.debug(${args})`;
  });

  // Replace console.error
  content = content.replace(/console\.error\((.*?)\)/g, (match, args) => {
    changes++;
    return `logger.error(${args})`;
  });

  // Replace console.warn
  content = content.replace(/console\.warn\((.*?)\)/g, (match, args) => {
    changes++;
    return `logger.warn(${args})`;
  });

  if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Migrated ${filePath} (${changes} changes)`);
  } else {
    console.log(`⏭️  Skipped ${filePath} (no changes needed)`);
  }
}

filesToMigrate.forEach(migrateFile);
console.log('\\n✅ Migration complete!');
```

Run with:
```bash
node scripts/migrate-logging.js
```

---

## 6. Testing After Migration

### Test Logger
```typescript
// In any component or file
import { logger } from '@/utils/logger';

logger.debug('Test debug message'); // Only shows in dev
logger.info('Test info message');   // Only shows in dev
logger.warn('Test warning');        // Always shows
logger.error('Test error', new Error('test')); // Always shows

// Performance testing
const measure = createMeasurement('API Call');
// ... do work ...
measure.end(); // Logs duration in dev only
```

### Test Safe Storage
```typescript
import { safeLocalStorage, safeSessionStorage } from '@/utils/safeStorage';

// Test basic operations
safeLocalStorage.setItem('test', 'value');
console.log(safeLocalStorage.getItem('test')); // 'value'

// Test objects
safeLocalStorage.setObject('user', { name: 'John' });
console.log(safeLocalStorage.getObject('user')); // { name: 'John' }

// Test Safari private mode simulation
// In Safari private mode, this should still work (uses memory fallback)
```

---

## 7. Initialization

### Add to main.tsx or App.tsx
```typescript
import { initializeSafeStorage } from '@/utils/safeStorage';

// At app startup
initializeSafeStorage();
```

This logs storage availability and size on app start.

---

## 8. Production Build Test

### Before Deploying
```bash
# Build for production
npm run build --workspace=apps/web

# Check that debug logs are removed
# Open dist/assets/*.js and search for 'console.log'
# Should find very few or none

# Test production build locally
npm run preview --workspace=apps/web
```

---

## 9. Migration Checklist

### Phase 1: Setup (15 minutes)
- [x] Create logger.ts utility
- [x] Create safeStorage.ts utility
- [ ] Add initializeSafeStorage() to App.tsx
- [ ] Test both utilities in development

### Phase 2: Critical Files (2 hours)
- [ ] Migrate OrganizationContext.tsx
- [ ] Migrate utils/notifications.ts
- [ ] Migrate utils/errorHandler.ts
- [ ] Test critical user flows

### Phase 3: Remaining Files (2 hours)
- [ ] Migrate usePerformanceMonitoring.ts
- [ ] Migrate backfillNotifications.ts
- [ ] Migrate other files (27 files total)
- [ ] Run E2E tests to verify

### Phase 4: Verification (30 minutes)
- [ ] Build production bundle
- [ ] Check bundle for console.log
- [ ] Test in Safari private mode
- [ ] Test in Chrome incognito
- [ ] Deploy to staging

---

## 10. Rollback Plan

If issues occur:

1. **Git has all original files** - easy rollback
2. **Logger is drop-in replacement** - no breaking changes
3. **Safe storage is compatible** - same API as localStorage

```bash
# Rollback specific file
git checkout HEAD -- apps/web/src/contexts/OrganizationContext.tsx

# Rollback all changes
git reset --hard HEAD
```

---

## 11. Success Metrics

### Before
- ❌ 177 console statements in production
- ❌ App crashes in Safari private mode
- ❌ No structured logging
- ❌ No error tracking integration

### After
- ✅ 0 debug logs in production
- ✅ Works in Safari private mode
- ✅ Structured logging with context
- ✅ Ready for Sentry/LogRocket
- ✅ Performance monitoring built-in

---

## Need Help?

Check:
- `apps/web/src/utils/logger.ts` - Logger implementation
- `apps/web/src/utils/safeStorage.ts` - Storage implementation
- Both files have extensive inline documentation

---

**Status:** 🟢 **READY TO MIGRATE**

Start with Phase 1, test thoroughly, then proceed to Phase 2.
