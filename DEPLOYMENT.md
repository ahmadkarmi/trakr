# Trakr Deployment Guide

## Quick Deploy to Vercel (Recommended)

### Prerequisites
- GitHub account with Trakr repository
- Supabase project (for backend)
- Vercel account (free tier available)

### Step 1: Prepare Environment Variables
You'll need these from your Supabase project:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon/public key

Optional:
- `VITE_LANDING_HERO_IMAGE` - Path to hero image (default: `/LandingPageMockUpHeroSectionTrakr.png`)
- `VITE_DEMO_VIDEO_URL` - Demo video embed URL
- `VITE_BETA_REQUEST_EMAIL` - Contact email (default: `contact@trakr.app`)

### Step 2: Deploy via Vercel Dashboard

1. **Go to [vercel.com](https://vercel.com) and sign in**
2. **Click "Add New Project"**
3. **Import your Trakr GitHub repository**
4. **Configure the project:**
   - Framework Preset: **Vite**
   - Root Directory: Leave as `.` (monorepo auto-detected)
   - Build Command: `cd apps/web && npm run build`
   - Output Directory: `apps/web/dist`
   - Install Command: `npm install`

5. **Add Environment Variables:**
   - Go to "Environment Variables" section
   - Add each variable:
     - `VITE_SUPABASE_URL` → Your Supabase URL
     - `VITE_SUPABASE_ANON_KEY` → Your Supabase anon key
     - (Add optional vars as needed)

6. **Click "Deploy"**

### Step 3: Verify Deployment

Once deployed, verify:
- ✅ Landing page loads at your domain
- ✅ Login page accessible at `/login`
- ✅ Authentication works with Supabase
- ✅ Beta request form submits to Supabase

---

## Alternative: Deploy via Vercel CLI

### Install Vercel CLI
```bash
npm install -g vercel
```

### Login
```bash
vercel login
```

### Deploy
```bash
# From project root
vercel

# Follow prompts:
# - Link to existing project or create new
# - Set root directory: .
# - Override build settings: No (uses vercel.json)
```

### Add Environment Variables
```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

### Deploy to Production
```bash
vercel --prod
```

---

## Post-Deployment

### 1. Configure Custom Domain (Optional)
- Go to Vercel project settings → Domains
- Add your custom domain
- Update DNS records as instructed

### 2. Enable Analytics (Optional)
- Go to Vercel project → Analytics
- Enable Web Analytics for free visitor insights

### 3. Set Up Preview Deployments
Vercel automatically creates preview deployments for:
- Every pull request
- Every push to non-production branches

### 4. Monitor Deployment
- Check Vercel dashboard for build logs
- Review deployment history
- Set up notifications for failed builds

---

## Environment Variables Reference

### Required
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://abc123.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | `eyJ...` |

### Optional
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_LANDING_HERO_IMAGE` | Hero image path | `/LandingPageMockUpHeroSectionTrakr.png` |
| `VITE_DEMO_VIDEO_URL` | Demo video embed URL | (none - section hidden) |
| `VITE_BETA_REQUEST_EMAIL` | Contact email | `contact@trakr.app` |

---

## Troubleshooting

### Build Fails
**Issue:** TypeScript errors or build failures
**Solution:** 
```bash
# Run locally first to catch errors
cd apps/web
npm run build
```

### Environment Variables Not Working
**Issue:** Variables not available at runtime
**Solution:** Ensure all variables start with `VITE_` prefix (Vite requirement)

### Routing Issues (404 on refresh)
**Issue:** SPA routes return 404 on direct access
**Solution:** Already configured in `vercel.json` rewrites

### Supabase Connection Fails
**Issue:** Can't connect to Supabase
**Solution:**
- Verify environment variables are set correctly
- Check Supabase URL format (should include `https://`)
- Ensure anon key is correct (not service role key)

---

## Continuous Deployment

Vercel automatically deploys:
- **Production:** Every push to `main` branch
- **Preview:** Every push to other branches and PRs

To disable auto-deploy for a branch:
- Go to Vercel project settings → Git
- Configure branch deployment rules

---

## Cost Estimation

### Vercel Free Tier Includes:
- ✅ 100GB bandwidth/month
- ✅ Unlimited deployments
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Preview deployments

**Should be sufficient for:**
- Beta testing phase
- Small to medium user base
- ~10,000-50,000 monthly visitors

### When to Upgrade:
- Need more bandwidth
- Want commercial support
- Require team collaboration features
- Need advanced analytics

---

## Alternative Platforms

### Netlify
Similar to Vercel, also offers:
- Free tier with good limits
- Easy Vite/React deployment
- Form handling for beta requests

### Cloudflare Pages
- Generous free tier
- Global edge network
- Good for high-traffic sites

### Render
- Simple deployment
- Free tier includes backend services
- Good for full-stack apps

---

## Security Checklist

Before deploying to production:
- [ ] Environment variables set (no hardcoded credentials)
- [ ] Supabase RLS policies configured
- [ ] CORS settings verified
- [ ] Rate limiting enabled (if needed)
- [ ] Error tracking set up (Sentry, LogRocket, etc.)
- [ ] Analytics configured
- [ ] Backup strategy in place

---

## Next Steps After Deployment

1. **Test all user flows** in production environment
2. **Run E2E tests** against production URL
3. **Monitor error rates** and performance
4. **Set up custom domain** (if not done)
5. **Share beta access** with test users
6. **Collect feedback** and iterate

---

## Support

For deployment issues:
- Vercel Docs: https://vercel.com/docs
- Vite Docs: https://vitejs.dev/guide/
- Supabase Docs: https://supabase.com/docs

For Trakr-specific questions:
- Check project README
- Review E2E tests for expected behavior
- Check GitHub Issues
