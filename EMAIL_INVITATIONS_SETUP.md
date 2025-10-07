# Email Invitations Setup Guide

**Choose your approach based on your needs:**

---

## **Option 1: Supabase Auth (Built-in)** ✅ **Recommended**

**Pros:**
- ✅ No external service needed
- ✅ Free (included with Supabase)
- ✅ Automatic email delivery
- ✅ Built-in email templates
- ✅ Magic link authentication

**Cons:**
- ⚠️ Limited email customization
- ⚠️ Requires service role key (security consideration)
- ⚠️ Uses Supabase branding by default

### **Setup Steps:**

#### **1. Enable Email in Supabase Dashboard**

```bash
# Go to: Supabase Dashboard → Authentication → Email Templates
# Ensure "Invite user" template is enabled
```

#### **2. Configure Email Template** (Optional)

In Supabase Dashboard → Authentication → Email Templates → Invite user:

```html
<h2>You're invited to join {{ .SiteURL }}</h2>
<p>Hi {{ .Data.name }},</p>
<p>You've been invited to join Trakr as a {{ .Data.role }}.</p>
<p><a href="{{ .ConfirmationURL }}">Accept invitation</a></p>
```

#### **3. Get Service Role Key**

⚠️ **IMPORTANT:** The service role key bypasses RLS. Keep it secret!

```bash
# Supabase Dashboard → Settings → API
# Copy "service_role" key (NOT anon key)
```

#### **4. Add to Environment Variables**

```bash
# .env.local
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

⚠️ **SECURITY WARNING:** Never expose service role key in frontend code!

#### **5. Create Server-Side API Route**

Since service role key cannot be used in browser, create a backend endpoint:

**Option A: Edge Function (Recommended)**

Create: `supabase/functions/invite-user/index.ts`

```typescript
import { createClient } from '@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  const { email, name, role, orgId } = await req.json()

  // Invite user via Auth
  const { data: authUser, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { name, role, org_id: orgId },
    redirectTo: `${req.headers.get('origin')}/login`
  })

  if (authError) {
    return new Response(JSON.stringify({ error: authError.message }), { status: 400 })
  }

  // Create user in database
  const { data, error } = await supabase.from('users').insert({
    id: authUser.user?.id,
    email,
    full_name: name,
    role: role.toUpperCase(),
    org_id: orgId,
    email_verified: false,
    is_active: true,
  }).select().single()

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }

  return new Response(JSON.stringify({ user: data }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

**Deploy:**
```bash
supabase functions deploy invite-user
```

**Option B: Next.js API Route**

If using Next.js, create: `pages/api/invite-user.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, name, role, orgId } = req.body

  const { data: authUser, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { name, role, org_id: orgId },
    redirectTo: `${process.env.NEXT_PUBLIC_URL}/login`
  })

  if (authError) {
    return res.status(400).json({ error: authError.message })
  }

  // Create user in database
  const { data, error } = await supabase.from('users').insert({
    id: authUser.user?.id,
    email,
    full_name: name,
    role: role.toUpperCase(),
    org_id: orgId,
    email_verified: false,
    is_active: true,
  }).select().single()

  if (error) {
    return res.status(400).json({ error: error.message })
  }

  return res.status(200).json({ user: data })
}
```

#### **6. Update Frontend to Call Edge Function**

In `apps/web/src/utils/supabaseApi.ts`:

```typescript
async inviteUser(email: string, name: string, role: UserRole): Promise<User> {
  const supabase = await getSupabase()
  
  // Get current user's org
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) throw new Error('Not authenticated')
  
  const { data: userData } = await supabase.from('users').select('org_id').eq('id', currentUser.id).single()
  if (!userData) throw new Error('User not found')

  // Call Edge Function
  const response = await supabase.functions.invoke('invite-user', {
    body: {
      email,
      name,
      role,
      orgId: userData.org_id
    }
  })

  if (response.error) throw new Error(response.error.message)
  
  return mapUser(response.data.user)
}
```

---

## **Option 2: Edge Function + Custom Email Service**

**Pros:**
- ✅ Full email customization
- ✅ Professional email templates
- ✅ Better deliverability
- ✅ Email analytics

**Cons:**
- ⚠️ Requires external service (Resend, SendGrid, etc.)
- ⚠️ Additional cost (usually free tier available)

### **Using Resend (Recommended)**

**Why Resend?**
- ✅ Free tier: 3,000 emails/month
- ✅ Great developer experience
- ✅ Modern API
- ✅ No credit card required for free tier

#### **Setup:**

1. **Sign up:** https://resend.com
2. **Get API key:** Dashboard → API Keys
3. **Add to Supabase Secrets:**

```bash
supabase secrets set RESEND_API_KEY=re_123...
```

4. **Create Edge Function:**

```typescript
// supabase/functions/send-invitation/index.ts
import { Resend } from 'npm:resend@2.0.0'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

Deno.serve(async (req) => {
  const { email, name, role, magicLink } = await req.json()

  const { data, error } = await resend.emails.send({
    from: 'Trakr <noreply@yourdomain.com>',
    to: email,
    subject: `You're invited to join Trakr`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Trakr!</h2>
        <p>Hi ${name},</p>
        <p>You've been invited to join Trakr as a <strong>${role}</strong>.</p>
        <p>Click the button below to set up your account:</p>
        <a href="${magicLink}" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Accept Invitation
        </a>
        <p style="color: #666; font-size: 14px;">
          Or copy and paste this link: ${magicLink}
        </p>
      </div>
    `
  })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }

  return new Response(JSON.stringify({ success: true, messageId: data.id }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

---

## **Option 3: SMTP Email Server**

**Pros:**
- ✅ Full control
- ✅ No third-party dependencies

**Cons:**
- ❌ Complex setup
- ❌ Deliverability issues
- ❌ Maintenance overhead
- ❌ **Not recommended** for most use cases

---

## **Comparison Table**

| Feature | Supabase Auth | Resend/SendGrid | SMTP |
|---------|---------------|-----------------|------|
| **Cost** | Free | Free tier available | Free (if self-hosted) |
| **Setup Time** | 10 minutes | 30 minutes | Hours/Days |
| **Customization** | Limited | Full | Full |
| **Deliverability** | Good | Excellent | Poor (without work) |
| **Maintenance** | None | None | High |
| **Email Analytics** | Basic | Yes | No |
| **Templates** | Basic | Professional | DIY |

---

## **Recommended Approach**

### **For MVP/Small Teams:**
✅ **Use Option 1: Supabase Auth**
- Quickest to implement
- No additional costs
- Good enough for most use cases

### **For Production/Large Teams:**
✅ **Use Option 2: Edge Function + Resend**
- Professional email templates
- Better branding
- Email analytics
- Better deliverability

---

## **Implementation Status**

Current code (already updated):
- ✅ Frontend calls `api.inviteUser()`
- ✅ Backend uses `supabase.auth.admin.inviteUserByEmail()`
- ⚠️ **Requires:** Edge Function or API route to use service role key

**Next Steps:**

1. Choose your approach (Supabase Auth recommended)
2. Create Edge Function (see Option 1, Step 5)
3. Deploy Edge Function
4. Test invitation flow
5. Customize email template (optional)

---

## **Testing**

```bash
# Test in dev
npm run dev

# Login as admin
# Go to Manage Users → Invite User
# Enter test email
# Check email inbox for invitation
```

---

## **Security Checklist**

- [ ] Service role key stored in environment variables (never in code)
- [ ] Edge Function/API route validates user permissions
- [ ] Email validation before sending
- [ ] Rate limiting on invitation endpoint
- [ ] Invitation links expire after 24 hours (Supabase default)

---

## **Troubleshooting**

**Email not sending:**
1. Check Supabase → Authentication → Email Templates is enabled
2. Verify service role key is correct
3. Check Edge Function logs: `supabase functions logs invite-user`

**Email goes to spam:**
1. Configure custom domain in Supabase settings
2. Add SPF/DKIM records
3. Or use Resend/SendGrid with verified domain

**User exists error:**
1. Check if email already in auth.users
2. Delete from Supabase Dashboard → Authentication → Users
3. Re-send invitation
