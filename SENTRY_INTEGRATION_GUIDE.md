# Sentry Integration Guide

Complete guide to integrating Sentry error tracking into your Trakr application.

---

## 📋 Table of Contents

1. [What is Sentry?](#what-is-sentry)
2. [Quick Setup](#quick-setup)
3. [Configuration](#configuration)
4. [Features Enabled](#features-enabled)
5. [Testing](#testing)
6. [Vercel Deployment](#vercel-deployment)
7. [Best Practices](#best-practices)

---

## 🎯 What is Sentry?

Sentry is an error tracking and performance monitoring platform that helps you:

- **Track production errors** with full stack traces
- **Monitor performance** and identify slow operations
- **Session replay** to see exactly what users did before an error
- **User context** to know which users are affected
- **Release tracking** to identify which version introduced bugs

---

## ⚡ Quick Setup

### Step 1: Create a Sentry Account

1. Go to [sentry.io](https://sentry.io) and sign up
2. Create a new project:
   - Platform: **JavaScript** → **React**
   - Project name: `trakr-web`
3. Copy your **DSN** (Data Source Name)

### Step 2: Install Dependencies

```bash
npm install @sentry/react @sentry/vite-plugin --workspace=@trakr/web
```

### Step 3: Configure Environment Variables

Add to your `.env` file (or Vercel dashboard):

```bash
# Runtime configuration (required)
VITE_SENTRY_DSN=https://xxxxx@yyyyy.ingest.sentry.io/zzzzz
VITE_APP_VERSION=1.0.0

# Build-time configuration (optional, for source maps)
SENTRY_AUTH_TOKEN=your_auth_token_here
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=trakr-web
```

### Step 4: You're Done! 🎉

The integration is already complete in your codebase. Sentry will:
- ✅ Initialize automatically on app startup
- ✅ Track errors from `logger.error()` calls
- ✅ Capture unhandled exceptions
- ✅ Track user context on login/logout
- ✅ Upload source maps in production builds

---

## 🔧 Configuration

### Files Modified

#### 1. **`apps/web/src/utils/sentry.ts`** - Main Configuration
- Initializes Sentry with proper settings
- Configures performance monitoring (10% sample rate)
- Enables session replay (10% of sessions, 100% with errors)
- Filters out sensitive data and browser extension errors
- Provides helper functions for manual tracking

#### 2. **`apps/web/src/utils/logger.ts`** - Error Integration
- Automatically sends errors to Sentry in production
- Dynamic import to avoid dev bundle bloat
- Includes context and metadata with errors

#### 3. **`apps/web/src/stores/auth.ts`** - User Tracking
- Sets user context on login
- Clears user context on logout
- Tracks user ID, email, role, and organization

#### 4. **`apps/web/src/main.tsx`** - Initialization
- Initializes Sentry before React renders
- Ensures errors during app startup are captured

#### 5. **`apps/web/vite.config.ts`** - Source Maps
- Uploads source maps to Sentry in production builds
- Automatically deletes maps after upload (security)

---

## ✨ Features Enabled

### 1. **Error Tracking**
```typescript
import { logger } from './utils/logger'

// Automatically sent to Sentry in production
logger.error('Failed to save data', error, { 
  context: 'SaveForm',
  data: { formId: 123 } 
})
```

### 2. **Performance Monitoring**
- Tracks page load times
- Monitors API response times
- Identifies slow components
- **Sample rate: 10%** (reduces quota usage)

### 3. **Session Replay**
- Records user sessions when errors occur
- Privacy-first: masks all text and blocks media
- **10% of all sessions** recorded
- **100% of error sessions** recorded

### 4. **User Context**
```typescript
// Automatically tracked on login
{
  id: 'user-123',
  email: 'admin@trakr.com',
  role: 'ADMIN',
  orgId: 'org-456'
}
```

### 5. **Breadcrumbs**
- Tracks user actions before errors
- API calls, navigation, clicks
- Helps reproduce bugs

### 6. **Release Tracking**
- Tied to `VITE_APP_VERSION`
- Identifies which version introduced bugs
- Tracks deployment health

---

## 🧪 Testing

### Test Error Tracking Locally

Add this to any component:

```typescript
import { captureException } from '@/utils/sentry'

// Test error capture
const testSentry = () => {
  try {
    throw new Error('Test Sentry integration!')
  } catch (error) {
    captureException(error, { test: true })
  }
}
```

### View in Development

Sentry is **disabled by default in development** to avoid noise. To test:

1. Build for production: `npm run build`
2. Preview build: `npm run preview`
3. Trigger an error
4. Check Sentry dashboard

---

## 🚀 Vercel Deployment

### Environment Variables

Set in Vercel dashboard (**Settings** → **Environment Variables**):

```bash
# Required for error tracking
VITE_SENTRY_DSN=https://xxxxx@yyyyy.ingest.sentry.io/zzzzz
VITE_APP_VERSION=1.0.0

# Optional: For source map uploads
SENTRY_AUTH_TOKEN=sntrys_xxxxxxxxxxxxx
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=trakr-web
```

### Get Sentry Auth Token

1. Go to **Sentry** → **Settings** → **Account** → **API** → **Auth Tokens**
2. Create new token with these scopes:
   - `project:read`
   - `project:releases`
   - `org:read`
3. Copy token and add to Vercel

### Build Settings

No changes needed! The build will automatically:
1. Build your app
2. Upload source maps to Sentry
3. Delete source maps from deployment (security)

---

## 💡 Best Practices

### 1. **Use the Logger**
```typescript
// ✅ Good - uses logger (Sentry-integrated)
logger.error('API call failed', error)

// ❌ Avoid - direct console.error (not tracked)
console.error('API call failed', error)
```

### 2. **Add Context**
```typescript
logger.error('Save failed', error, {
  context: 'ProfileForm',
  data: { userId: user.id, formStep: 2 }
})
```

### 3. **Manual Captures (When Needed)**
```typescript
import { captureException, captureMessage } from '@/utils/sentry'

// Capture exception with extra context
captureException(error, { 
  userId: user.id,
  action: 'submit-audit' 
})

// Capture informational message
captureMessage('User completed onboarding', 'info')
```

### 4. **Add Breadcrumbs**
```typescript
import { addBreadcrumb } from '@/utils/sentry'

addBreadcrumb('User clicked export button', {
  exportType: 'pdf',
  recordCount: 150
})
```

### 5. **Set Custom Context**
```typescript
import { setContext } from '@/utils/sentry'

setContext('audit', {
  auditId: audit.id,
  branchId: audit.branchId,
  status: audit.status
})
```

---

## 📊 Understanding Sample Rates

### Performance Monitoring (10%)
```typescript
tracesSampleRate: 0.1
```
- Monitors 10% of all transactions
- Reduces quota usage
- Increase to `1.0` for more data (costs more)

### Session Replay
```typescript
replaysSessionSampleRate: 0.1  // 10% of all sessions
replaysOnErrorSampleRate: 1.0   // 100% of error sessions
```
- Records 10% of normal sessions
- **Always** records sessions with errors
- Helps reproduce bugs visually

---

## 🔒 Privacy & Security

### Data Filtering

Sentry automatically:
- **Masks all text** in session replays
- **Blocks media** (images/videos) in replays
- **Filters passwords** from breadcrumbs
- **Filters tokens** from API calls
- **Ignores browser extensions** errors

### Custom Filtering

Add more filters in `sentry.ts`:

```typescript
beforeSend(event) {
  // Remove specific data
  if (event.request?.data?.creditCard) {
    delete event.request.data.creditCard
  }
  return event
}
```

---

## 📈 Monitoring Production

### What to Watch

1. **Error Rate**: Should be < 1% of requests
2. **Performance**: Track slow API calls
3. **User Impact**: How many users affected?
4. **Release Health**: Did new deploy increase errors?

### Sentry Dashboard

- **Issues**: All errors grouped by type
- **Performance**: Transaction times, API latency
- **Releases**: Health of each deployment
- **Alerts**: Set up email/Slack notifications

### Set Up Alerts

1. Go to **Alerts** → **Create Alert Rule**
2. Choose trigger:
   - Error rate spike
   - Performance degradation
   - New error never seen before
3. Configure notification (email/Slack)

---

## 🛠️ Advanced Usage

### Disable in Specific Environments

```typescript
// In sentry.ts
if (window.location.hostname === 'staging.trakr.com') {
  // Don't initialize Sentry on staging
  return
}
```

### Custom Error Boundaries

```typescript
import * as Sentry from '@sentry/react'

const ErrorFallback = ({ error }) => (
  <div>
    <h1>Something went wrong</h1>
    <button onClick={() => Sentry.showReportDialog()}>
      Report Feedback
    </button>
  </div>
)

<Sentry.ErrorBoundary fallback={ErrorFallback}>
  <MyComponent />
</Sentry.ErrorBoundary>
```

### Track Custom Metrics

```typescript
import { Sentry } from '@/utils/sentry'

// Track custom metric
Sentry.metrics.increment('audit.submitted', 1, {
  tags: { branchId: branch.id }
})
```

---

## 🆘 Troubleshooting

### Sentry Not Capturing Errors

**Check:**
1. ✅ Is `VITE_SENTRY_DSN` set?
2. ✅ Are you in production mode? (Sentry disabled in dev)
3. ✅ Check browser console for Sentry init message
4. ✅ Verify DSN is correct in Sentry dashboard

### Source Maps Not Working

**Check:**
1. ✅ Is `SENTRY_AUTH_TOKEN` set in Vercel?
2. ✅ Does token have correct scopes?
3. ✅ Check Vercel build logs for "Uploading source maps"
4. ✅ Verify project name matches Sentry

### Too Many Errors

**Solutions:**
1. Add errors to `ignoreErrors` array in `sentry.ts`
2. Reduce `tracesSampleRate` to save quota
3. Set up Inbound Filters in Sentry dashboard

---

## 💰 Pricing & Quotas

### Free Tier
- **5,000 errors/month**
- **10,000 performance events/month**
- **50 session replays/month**
- 1 user

### Team Tier ($26/month)
- **50,000 errors/month**
- **100,000 performance events/month**
- **500 session replays/month**
- Up to 20 users

### Tips to Stay Under Quota

1. Use sample rates (10% recommended)
2. Filter out non-critical errors
3. Only enable replays on errors
4. Set up alerts when approaching limits

---

## 📚 Resources

- [Sentry React Docs](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry Vite Plugin](https://docs.sentry.io/platforms/javascript/guides/react/sourcemaps/uploading/vite/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Session Replay](https://docs.sentry.io/product/session-replay/)
- [Best Practices](https://docs.sentry.io/product/best-practices/)

---

## ✅ Quick Checklist

Before going to production:

- [ ] Create Sentry project
- [ ] Copy DSN to Vercel environment variables
- [ ] Set `VITE_APP_VERSION` in Vercel
- [ ] Create Sentry auth token (optional, for source maps)
- [ ] Add auth token to Vercel (optional)
- [ ] Test error capture in preview deployment
- [ ] Set up email/Slack alerts
- [ ] Review and adjust sample rates
- [ ] Add error budget to monitoring dashboard

---

**You're all set! 🎉**

Sentry is now integrated and will automatically track errors, performance, and user sessions in production.
