# Quick Start: Email Invitations

**Get email invitations working in 10 minutes!** 📧

---

## **Step 1: Deploy Edge Function** (5 minutes)

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF
```

**Find your project ref:**
- Supabase Dashboard → Settings → General → Reference ID
- Or get it from your project URL: `https://YOUR_PROJECT_REF.supabase.co`

```bash
# Deploy the function
supabase functions deploy invite-user
```

**Expected output:**
```
Deploying Function invite-user...
Function invite-user deployed successfully!
```

---

## **Step 2: Enable Email Template** (2 minutes)

1. Open **Supabase Dashboard**
2. Go to: **Authentication** → **Email Templates**
3. Find **"Invite user"** template
4. Click **Enable**
5. (Optional) Customize the template text

---

## **Step 3: Test!** (3 minutes)

```bash
# Start your app
npm run dev

# 1. Login as admin (admin@trakr.com)
# 2. Go to "Manage Users"
# 3. Click "Invite User"
# 4. Fill in:
#    - Email: your-test-email@gmail.com
#    - Name: Test User
#    - Role: Auditor
# 5. Click "Send Invitation"
```

**Check your email inbox!** You should receive:
```
From: noreply@mail.supabase.io
Subject: You've been invited
```

---

## **What the User Will See**

**Email Preview:**
```
┌─────────────────────────────────────────┐
│ From: noreply@mail.supabase.io          │
│ Subject: You've been invited            │
├─────────────────────────────────────────┤
│                                         │
│ You have been invited to create a user  │
│ on [Your Project].                      │
│                                         │
│ Follow this link to accept the invite:  │
│                                         │
│     [Accept the invite]                 │
│                                         │
│ This link will expire in 24 hours.      │
└─────────────────────────────────────────┘
```

---

## **Current Status**

✅ **Working:**
- Users can be invited
- Emails sent automatically
- Magic link authentication
- User records created

⚠️ **Email shows:**
- From: `noreply@mail.supabase.io` (Supabase's default)
- Basic template

✅ **Later upgrade to YOUR email:**
- See `EMAIL_SENDER_OPTIONS.md`
- 5-minute SMTP setup in Supabase Dashboard
- No code changes needed!

---

## **Troubleshooting**

### **"Function not found" error**

Check deployment:
```bash
supabase functions list
```

Should show:
```
┌──────────────┬──────────┬─────────────┐
│ Name         │ Status   │ Updated     │
├──────────────┼──────────┼─────────────┤
│ invite-user  │ ACTIVE   │ just now    │
└──────────────┴──────────┴─────────────┘
```

If not listed, redeploy:
```bash
supabase functions deploy invite-user
```

### **Email not arriving**

1. **Check spam folder**
2. **Verify template is enabled:**
   - Dashboard → Authentication → Email Templates → Invite user
3. **Check Edge Function logs:**
   ```bash
   supabase functions logs invite-user
   ```
4. **Look for errors in logs:**
   ```bash
   # View live logs
   supabase functions logs invite-user --follow
   ```

### **"Unauthorized" error**

Make sure:
1. You're logged in as ADMIN or SUPER_ADMIN
2. Your user has the correct role in the `users` table:
   ```sql
   SELECT id, email, role FROM users WHERE email = 'admin@trakr.com';
   ```

### **"User already exists" error**

The email is already registered. Options:
1. **Use a different email**
2. **Delete the user:**
   - Dashboard → Authentication → Users → Find user → Delete
   - Then try inviting again

---

## **View Invitation Activity**

### **Check sent invitations:**

**In Supabase Dashboard:**
1. Go to: **Authentication** → **Users**
2. Look for users with:
   - Status: "Invited" or "Not confirmed"
   - Last sign-in: Never

**In logs:**
```bash
supabase functions logs invite-user
```

You'll see:
```
✅ User invited successfully: test@example.com as AUDITOR
📧 Email sent from: noreply@mail.supabase.io
```

---

## **Testing Checklist**

- [ ] Edge Function deployed successfully
- [ ] Email template enabled in Supabase
- [ ] Invited a test user
- [ ] Received invitation email
- [ ] Clicked invitation link
- [ ] Successfully logged in
- [ ] User appears in Manage Users list

---

## **Next Steps**

Once this is working:

1. **Customize email template** (optional)
   - Dashboard → Authentication → Email Templates → Invite user
   - Add your branding/messaging

2. **Set up custom domain** (later)
   - See `EMAIL_SENDER_OPTIONS.md`
   - Configure SMTP in Supabase
   - Emails will come from YOUR domain

3. **Add to production**
   - Works the same in production
   - Just deploy the Edge Function to prod project

---

## **Deployment Commands Reference**

```bash
# Deploy to production
supabase link --project-ref YOUR_PROD_PROJECT_REF
supabase functions deploy invite-user

# View logs (dev)
supabase functions logs invite-user

# View logs (prod)
supabase functions logs invite-user --project-ref YOUR_PROD_PROJECT_REF

# List all functions
supabase functions list

# Delete function (if needed)
supabase functions delete invite-user
```

---

## **Cost**

**Everything is FREE:**
- ✅ Supabase email sending: FREE
- ✅ Edge Functions: FREE (500K invocations/month)
- ✅ Auth users: FREE (up to 50K monthly active users)

**No credit card required!**

---

**Ready to deploy? Run the commands in Step 1!** 🚀
