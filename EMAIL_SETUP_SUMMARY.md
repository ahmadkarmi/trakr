# Email Invitations - Quick Start

## **Answer: You DON'T need an external service!** ✅

You can use **Supabase's built-in email** system - it's free and included.

---

## **What I've Set Up For You**

### **1. Frontend (Already Done)** ✅
- `ManageUsers.tsx` calls `api.inviteUser()`
- Proper error handling and user feedback

### **2. Backend API (Already Done)** ✅
- `supabaseApi.ts` calls Edge Function
- Validates permissions and org context

### **3. Edge Function (Created)** ✅
- `supabase/functions/invite-user/index.ts`
- Uses Supabase Auth to send emails
- Secure (uses service role key on server side)

---

## **How to Enable Email Invitations**

### **Step 1: Deploy the Edge Function** (5 minutes)

```bash
# Install Supabase CLI (if you haven't)
npm install -g supabase

# Login
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the function
supabase functions deploy invite-user
```

### **Step 2: Enable Email in Supabase** (2 minutes)

1. Go to Supabase Dashboard
2. Navigate to: **Authentication** → **Email Templates**
3. Find **"Invite user"** template
4. Click **Enable**
5. (Optional) Customize the email template

### **Step 3: Test!** (1 minute)

```bash
# Start your app
npm run dev

# Login as admin
# Go to Manage Users
# Click "Invite User"
# Enter email, name, role
# Click "Send Invitation"
# Check the email inbox!
```

---

## **That's It!** 🎉

**Total setup time:** ~10 minutes

**No external service needed.**  
**No credit card required.**  
**No additional costs.**

---

## **What Happens When You Invite a User?**

1. **Admin clicks "Invite User"** in UI
2. **Frontend calls** `api.inviteUser(email, name, role)`
3. **Edge Function:**
   - Creates user in Supabase Auth
   - Sends invitation email (automatic)
   - Creates user record in database
4. **User receives email** with magic link
5. **User clicks link** → redirected to `/login`
6. **User sets password** and logs in

---

## **Email Template Example**

Default Supabase email looks like:

```
Subject: You've been invited

You have been invited to create a user on [Your App].

Click here to accept the invite: [Magic Link]

This link expires in 24 hours.
```

**To customize:**
1. Dashboard → Authentication → Email Templates → Invite user
2. Edit HTML/text
3. Use variables: `{{ .Email }}`, `{{ .ConfirmationURL }}`, `{{ .Data.name }}`

---

## **Cost Breakdown**

| Service | Cost | Limit |
|---------|------|-------|
| Supabase Auth Emails | **FREE** | Included with Supabase |
| Edge Functions | **FREE** | 500K invocations/month |
| **Total** | **$0** | More than enough for most apps |

---

## **Advanced: Using Custom Email Service** (Optional)

If you want professional branded emails, see: `EMAIL_INVITATIONS_SETUP.md`

Options:
- **Resend** - Free 3,000 emails/month
- **SendGrid** - Free 100 emails/day
- **Mailgun** - Pay as you go

But **start with Supabase Auth** - it's good enough!

---

## **Troubleshooting**

### **Email not arriving?**

1. **Check spam folder**
2. **Verify email template is enabled:**
   - Dashboard → Authentication → Email Templates → Invite user
3. **Check Edge Function logs:**
   ```bash
   supabase functions logs invite-user
   ```
4. **Test email delivery:**
   - Dashboard → Authentication → Email Templates → Test
   
### **"Edge Function not found" error?**

1. **Deploy the function:**
   ```bash
   supabase functions deploy invite-user
   ```
2. **Check it's deployed:**
   ```bash
   supabase functions list
   ```

### **"Unauthorized" error?**

The function checks if the user is an admin. Make sure:
1. You're logged in as ADMIN or SUPER_ADMIN
2. Your user record has the correct role in the database

---

## **Files Created**

✅ `supabase/functions/invite-user/index.ts` - Edge Function  
✅ `supabase/functions/_shared/cors.ts` - CORS helper  
✅ `supabase/functions/DEPLOY.md` - Deployment guide  
✅ `EMAIL_INVITATIONS_SETUP.md` - Detailed setup guide  
✅ `EMAIL_SETUP_SUMMARY.md` - This file  

---

## **Next Steps**

1. ✅ Deploy Edge Function (see Step 1 above)
2. ✅ Enable email template in Supabase
3. ✅ Test inviting a user
4. 🎨 (Optional) Customize email template
5. 📧 (Optional) Set up custom domain for emails

---

**Questions? Check `EMAIL_INVITATIONS_SETUP.md` for detailed docs!**
