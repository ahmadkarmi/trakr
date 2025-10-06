# Code Splitting & Lazy Loading

## Overview

Trakr uses code splitting and lazy loading to optimize bundle size and improve initial load performance. This ensures users only download the code they need when they need it.

## Implementation Strategy

### 1. Route-Level Code Splitting

All routes are lazy-loaded using React's `lazy()` API. Vite automatically handles chunk naming and optimization:

```typescript
const DashboardAuditor = lazy(() => import('./screens/DashboardAuditor'))
```

**Benefits:**
- Reduces initial bundle size by ~60-70%
- Faster Time to Interactive (TTI)
- Better Core Web Vitals scores

### 2. Vendor Chunking

Dependencies are split into logical chunks:

- `vendor-react`: React core libraries (~140KB)
- `vendor-data`: Data management (Supabase, React Query, Zustand) (~80KB)
- `vendor-ui`: UI utilities (HeadlessUI, Heroicons) (~40KB)
- `vendor-charts`: Chart libraries (Recharts) (~150KB)
- `vendor-pdf`: PDF generation (jsPDF) (~120KB)
- `vendor-utils`: Utilities (date-fns) (~30KB)

**Benefits:**
- Better caching (vendor code changes less frequently)
- Parallel downloads
- Efficient code reuse

### 3. Component-Level Lazy Loading

Heavy components are lazy-loaded within screens:

```typescript
import { LazyBarChart } from '@/components/LazyComponents'

// Chart only loads when needed
<LazyBarChart data={chartData} />
```

**Benefits:**
- Further reduces route bundle size
- Interactive UI while heavy components load
- Graceful loading states

### 4. Route Prefetching

Links prefetch routes on hover/focus:

```typescript
import { prefetchOnHover } from '@/utils/routePrefetch'

<Link 
  to="/audit/123" 
  {...prefetchOnHover('audit-detail', () => import('./screens/AuditDetail'))}
>
  View Audit
</Link>
```

**Benefits:**
- Near-instant navigation for hovered links
- Uses browser idle time
- No impact on current page performance

## Bundle Analysis

### Running Bundle Analyzer

```bash
npm run build:analyze
```

This generates a visual treemap showing:
- Bundle composition
- Chunk sizes
- Dependency weights

### Expected Bundle Sizes (Production)

**Before Code Splitting:**
- Initial bundle: ~800KB gzipped
- Total: ~800KB for first load

**After Code Splitting:**
- Initial bundle: ~250KB gzipped
- Vendor chunks: ~400KB (cached)
- Route chunks: 20-80KB each (loaded on demand)
- Total first load: ~300KB for average route

**Improvement:** ~62% reduction in initial load

## Performance Metrics

### Target Metrics

- **First Contentful Paint (FCP):** < 1.5s
- **Largest Contentful Paint (LCP):** < 2.5s
- **Time to Interactive (TTI):** < 3.5s
- **Total Blocking Time (TBT):** < 300ms

### Monitoring

Use the performance monitoring hook:

```typescript
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring'

const { logMetrics } = usePerformanceMonitoring()
```

## Best Practices

### 1. Lazy Load Routes

✅ **Do:**
```typescript
const Settings = lazy(() => import('./screens/Settings'))
```

❌ **Don't:**
```typescript
import Settings from './screens/Settings' // Eager load
```

### 2. Loading States

✅ **Do:**
```typescript
<Suspense fallback={<LoadingScreen showSkeleton />}>
  <LazyComponent />
</Suspense>
```

❌ **Don't:**
```typescript
<Suspense fallback={null}> // No feedback to user
```

### 4. Preload Critical Routes

For authenticated users, preload their dashboard:

```typescript
useEffect(() => {
  if (user) {
    preloadRoute('dashboard', () => import('./screens/Dashboard'))
  }
}, [user])
```

## Troubleshooting

### Issue: Chunks Loading Slowly

**Solution:** Check network tab, consider preloading commonly accessed routes

### Issue: "Module not found" Errors

**Solution:** Ensure dynamic import paths are correct and components are default exports

### Issue: Duplicate Code in Chunks

**Solution:** Review `manualChunks` configuration in `vite.config.ts`

### Issue: Flash of Loading State

**Solution:** Preload route when user hovers over link

## Future Improvements

1. **Route-based prefetching** - Automatically prefetch likely next routes
2. **Image lazy loading** - Defer offscreen images
3. **CSS code splitting** - Split CSS by route
4. **Progressive Web App** - Cache chunks for offline use
5. **HTTP/2 Push** - Push critical chunks with initial response

## References

- [React Code Splitting](https://react.dev/reference/react/lazy)
- [Vite Code Splitting](https://vitejs.dev/guide/features.html#code-splitting)
- [Web Vitals](https://web.dev/vitals/)
