# 🚀 Sentry Setup - Quick Start

Your Sentry project is ready! Follow these 3 simple steps:

---

## ✅ Step 1: Install Dependencies

Run this command:

```bash
npm install @sentry/react @sentry/vite-plugin --workspace=@trakr/web
```

---

## ✅ Step 2: Add Your DSN to Environment Variables

### For Local Development:

Create or edit your `.env` file in the project root:

```bash
# Add this to .env
VITE_SENTRY_DSN=https://ae7294dfb9d712a4e539199b824346dc@o4510217719185408.ingest.de.sentry.io/4510217756475472
VITE_APP_VERSION=1.0.0
```

### For Vercel Production:

1. Go to your **Vercel Dashboard**
2. Select your **Trakr** project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

| Variable | Value |
|----------|-------|
| `VITE_SENTRY_DSN` | `https://ae7294dfb9d712a4e539199b824346dc@o4510217719185408.ingest.de.sentry.io/4510217756475472` |
| `VITE_APP_VERSION` | `1.0.0` |

5. Click **Save**
6. **Redeploy** your app for changes to take effect

---

## ✅ Step 3: You're Done! 🎉

The integration is already complete in your codebase. After adding the environment variables, Sentry will automatically:

- ✅ Track all errors in production
- ✅ Monitor performance (page loads, API calls)
- ✅ Record user sessions when errors occur
- ✅ Attach user context (ID, email, role)
- ✅ Upload source maps for readable stack traces

---

## 🧪 Test It Works

### Local Testing:

```bash
# 1. Build for production (Sentry is disabled in dev mode)
cd apps/web
npm run build

# 2. Preview the production build
npm run preview

# 3. Trigger a test error
# Add this to any component:
throw new Error('Test Sentry integration!')

# 4. Check your Sentry dashboard - you should see the error!
```

### Test in Production (After Deployment):

1. Deploy to Vercel
2. Open your production app
3. Trigger an error (try an invalid action)
4. Go to [Sentry Dashboard](https://sentry.io)
5. Check **Issues** - your error should appear!

---

## 📊 What You Get

Your Sentry setup includes:

### Error Tracking
- **Automatic error capture** from `logger.error()` calls
- **Unhandled exceptions** caught automatically
- **Full stack traces** with source maps
- **User context** (who experienced the error)

### Performance Monitoring
- **API response times**
- **Page load performance**
- **Slow operations detection**
- **Sample rate: 10%** (reduces quota usage)

### Session Replay
- **Visual playback** of user sessions with errors
- **Privacy-first**: All text masked, media blocked
- **10% of normal sessions** + **100% of error sessions**

### User Context (Automatic)
Every error includes:
- User ID
- Email address
- User role (Admin, Auditor, etc.)
- Organization ID

---

## 🔒 Privacy Settings

Already configured for you:

- ✅ **Text masking** in session replays
- ✅ **Media blocking** in replays
- ✅ **Password filtering** from logs
- ✅ **Token filtering** from API calls
- ✅ **Browser extension errors ignored**
- ✅ **IP address collection** enabled (helps with debugging)

---

## 💡 How to Use

Sentry works automatically, but you can also manually track errors:

### Automatic (Recommended)
```typescript
import { logger } from '@/utils/logger'

// This automatically sends to Sentry in production
logger.error('Failed to save audit', error, {
  context: 'AuditForm',
  data: { auditId: audit.id }
})
```

### Manual (Advanced)
```typescript
import { captureException, captureMessage } from '@/utils/sentry'

// Capture a specific error
captureException(error, { 
  customContext: 'something important' 
})

// Capture an info message
captureMessage('User completed onboarding', 'info')
```

---

## 📈 Monitoring Your App

### Sentry Dashboard Sections:

1. **Issues** - All errors grouped by type
2. **Performance** - API latency, slow pages
3. **Releases** - Track health of each deployment
4. **Replays** - Watch user sessions with errors
5. **Alerts** - Get notified of problems

### Recommended Alerts:

Set up in Sentry Dashboard → **Alerts** → **Create Alert**:

- **Error rate spike** - Get notified when errors increase
- **New issue** - Alert on first-time errors
- **Performance degradation** - Slow API calls
- **High error volume** - More than X errors/minute

---

## 🆘 Troubleshooting

### "Sentry not capturing errors"

**Check:**
1. Is `VITE_SENTRY_DSN` set correctly?
2. Are you testing in **production build**? (Sentry disabled in dev)
3. Check browser console for Sentry initialization message
4. Verify DSN matches your Sentry project

### "Source maps not working"

**Optional feature** - requires auth token:
1. Create auth token in Sentry → Settings → Auth Tokens
2. Add to Vercel: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
3. Rebuild and redeploy

---

## 📚 Full Documentation

For advanced features and configuration, see:
- **`SENTRY_INTEGRATION_GUIDE.md`** - Complete guide
- [Sentry React Docs](https://docs.sentry.io/platforms/javascript/guides/react/)

---

## 🎯 Quick Checklist

- [ ] Install `@sentry/react` and `@sentry/vite-plugin`
- [ ] Add `VITE_SENTRY_DSN` to `.env` (local)
- [ ] Add `VITE_SENTRY_DSN` to Vercel (production)
- [ ] Add `VITE_APP_VERSION=1.0.0` to both
- [ ] Test with production build (`npm run build && npm run preview`)
- [ ] Deploy to Vercel
- [ ] Check Sentry dashboard for first errors
- [ ] Set up alert rules

---

**Ready to deploy!** 🚀

Your Sentry integration is complete. Just add the environment variables and start monitoring your production app.
