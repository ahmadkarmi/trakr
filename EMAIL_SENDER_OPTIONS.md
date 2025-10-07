# Email Sender Options - What Users See

## **Question: Does it show MY email or Supabase's email?**

---

## **Option 1: Default Supabase (No Setup)** ⚠️

### **What Users See:**
```
From: noreply@mail.supabase.io
Subject: You've been invited
```

### **Email Preview:**
```
┌─────────────────────────────────────────┐
│ From: noreply@mail.supabase.io          │
│ Subject: You've been invited            │
├─────────────────────────────────────────┤
│                                         │
│ You have been invited to create a user  │
│ on [Your App].                          │
│                                         │
│ Click here to accept the invite         │
│ [Accept Invitation]                     │
│                                         │
│ This link expires in 24 hours.          │
└─────────────────────────────────────────┘
```

### **Pros:**
- ✅ Works immediately (no setup)
- ✅ Free

### **Cons:**
- ❌ Shows Supabase branding
- ❌ May trigger spam filters
- ❌ Not professional
- ❌ Can't customize template much

---

## **Option 2: Custom SMTP in Supabase** ✅ **Recommended**

### **What Users See:**
```
From: Trakr <noreply@yourdomain.com>
Subject: You've been invited to join Trakr
```

### **Email Preview:**
```
┌─────────────────────────────────────────┐
│ From: Trakr <noreply@yourdomain.com>    │
│ Subject: You've been invited to join... │
├─────────────────────────────────────────┤
│                                         │
│ You have been invited to create a user  │
│ on Trakr.                               │
│                                         │
│ [Accept Invitation]                     │
│                                         │
│ This link expires in 24 hours.          │
└─────────────────────────────────────────┘
```

### **Setup (5 minutes):**

1. **Supabase Dashboard** → Settings → Authentication → **SMTP Settings**

2. **Configure your email provider:**

#### **Option A: Gmail (Free)**
```
Host: smtp.gmail.com
Port: 587
Username: your-email@gmail.com
Password: [App Password - see below]
Sender: Trakr <noreply@yourdomain.com>
```

**Get Gmail App Password:**
1. Go to: https://myaccount.google.com/apppasswords
2. Create app password for "Supabase"
3. Copy the 16-character password

#### **Option B: Google Workspace (Professional)**
```
Host: smtp.gmail.com
Port: 587
Username: noreply@yourdomain.com
Password: [App Password]
Sender: Trakr <noreply@yourdomain.com>
```

#### **Option C: SendGrid (Reliable)**
```
Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: [Your SendGrid API Key]
Sender: Trakr <noreply@yourdomain.com>
```

**SendGrid Setup:**
1. Sign up: https://sendgrid.com (free tier: 100 emails/day)
2. Settings → API Keys → Create API Key
3. Copy the key

### **Pros:**
- ✅ YOUR domain name
- ✅ Professional appearance
- ✅ Better deliverability
- ✅ Easy setup
- ✅ Can customize template in Supabase

### **Cons:**
- ⚠️ Requires email provider setup
- ⚠️ Limited template customization

---

## **Option 3: Resend/SendGrid Direct** 💎 **Best for Branding**

### **What Users See:**
```
From: Trakr <noreply@yourdomain.com>
Subject: You're invited to join Trakr
```

### **Email Preview:**
```
┌─────────────────────────────────────────┐
│ From: Trakr <noreply@yourdomain.com>    │
│ Subject: You're invited to join Trakr   │
├─────────────────────────────────────────┤
│            ┌─────────┐                  │
│            │  Trakr  │  [Your Logo]     │
│            └─────────┘                  │
│                                         │
│  Welcome to Trakr!                      │
│                                         │
│  Hi John,                               │
│                                         │
│  You've been invited to join Trakr as   │
│  an Auditor. Click below to get started.│
│                                         │
│       ┌────────────────────┐            │
│       │ Accept Invitation  │            │
│       └────────────────────┘            │
│                                         │
│  This invitation expires in 24 hours.   │
│                                         │
│  ────────────────────────────           │
│  © 2025 Trakr. All rights reserved.    │
└─────────────────────────────────────────┘
```

### **Setup:**

1. **Sign up for Resend (Free):**
   - https://resend.com
   - Free tier: 3,000 emails/month
   - Get API key

2. **Add to Supabase:**
   ```bash
   supabase secrets set RESEND_API_KEY=re_...
   ```

3. **Deploy function:**
   ```bash
   supabase functions deploy invite-user-resend
   ```

4. **Update frontend** to call new function:
   ```typescript
   // In supabaseApi.ts
   const { data, error } = await supabase.functions.invoke('invite-user-resend', {
     body: { email, name, role, orgId }
   })
   ```

### **Pros:**
- ✅ Full HTML customization
- ✅ YOUR branding/logo
- ✅ Excellent deliverability
- ✅ Email analytics
- ✅ Professional templates
- ✅ Click tracking

### **Cons:**
- ⚠️ Requires external service (but free tier is generous)
- ⚠️ More setup steps

---

## **Comparison Table**

| Feature | Default Supabase | SMTP (Your Domain) | Resend Direct |
|---------|------------------|-------------------|---------------|
| **From Address** | noreply@mail.supabase.io | noreply@yourdomain.com | noreply@yourdomain.com |
| **Setup Time** | 0 min | 5 min | 15 min |
| **Branding** | Supabase | Your name | Full custom |
| **Template Control** | Limited | Basic | Full HTML |
| **Cost** | Free | Free* | Free tier |
| **Deliverability** | OK | Good | Excellent |
| **Spam Score** | Higher | Medium | Low |
| **Analytics** | No | No | Yes |
| **Logo Support** | No | No | Yes |

*Free with Gmail, Google Workspace, or SendGrid free tier

---

## **Recommended Path**

### **For MVP/Testing:**
✅ **Start with Option 1** (Default Supabase)
- Get it working first
- Test the flow
- No setup needed

### **Before Launch:**
✅ **Upgrade to Option 2** (Custom SMTP)
- Use Gmail or Google Workspace
- 5-minute setup
- Much more professional

### **For Production:**
✅ **Consider Option 3** (Resend)
- Best user experience
- Professional branding
- Better deliverability
- Email analytics

---

## **Quick Setup Guide - Option 2 (Recommended)**

### **Using Gmail (Easiest)**

1. **Create App Password:**
   - Go to: https://myaccount.google.com/apppasswords
   - App: "Supabase"
   - Copy 16-character password

2. **Configure Supabase:**
   - Dashboard → Settings → Authentication → SMTP Settings
   - Enable custom SMTP
   - Fill in:
     ```
     Host: smtp.gmail.com
     Port: 587
     Username: your-email@gmail.com
     Password: [paste app password]
     Sender: Trakr <noreply@yourdomain.com>
     ```

3. **Test:**
   - Send test email from dashboard
   - Check inbox!

4. **Done!** ✅
   - All invitation emails now come from YOUR domain

---

## **Domain Setup (For Better Deliverability)**

If you own `yourdomain.com`, add these DNS records:

### **SPF Record:**
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.google.com ~all
```

### **DKIM Record:**
```
Type: TXT
Name: google._domainkey
Value: [Get from Google Workspace or SendGrid]
```

### **DMARC Record:**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:admin@yourdomain.com
```

This prevents emails from going to spam!

---

## **What I Recommend**

**Start here:**
1. ✅ Deploy the basic Edge Function (already created)
2. ✅ Use default Supabase emails (works immediately)
3. ✅ Test the invitation flow

**Before going live:**
1. ✅ Set up custom SMTP with Gmail (5 minutes)
2. ✅ Customize email template in Supabase dashboard
3. ✅ Add SPF/DKIM records

**For scale:**
1. ✅ Migrate to Resend (when you need analytics/branding)
2. ✅ Use the `invite-user-resend` function (already created)

---

## **Files Already Created**

✅ `supabase/functions/invite-user/index.ts` - Basic version (uses Supabase email)  
✅ `supabase/functions/invite-user-resend/index.ts` - Advanced version (uses Resend)  
✅ Both are ready to deploy!

**Choose based on your needs!**
