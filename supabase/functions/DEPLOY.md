# Deploy Edge Functions

## Prerequisites

1. **Install Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase:**
   ```bash
   supabase login
   ```

3. **Link to your project:**
   ```bash
   supabase link --project-ref your-project-ref
   ```
   
   Find your project ref in: Supabase Dashboard → Settings → General → Reference ID

---

## Deploy invite-user Function

```bash
# From project root
supabase functions deploy invite-user

# Or deploy all functions
supabase functions deploy
```

---

## Test the Function

```bash
# Get your auth token (from browser dev tools after logging in)
TOKEN="your-auth-token"

# Test the function
curl -i --location --request POST 'https://your-project.supabase.co/functions/v1/invite-user' \
  --header "Authorization: Bearer $TOKEN" \
  --header 'Content-Type: application/json' \
  --data '{
    "email": "test@example.com",
    "name": "Test User",
    "role": "AUDITOR",
    "orgId": "your-org-id"
  }'
```

---

## View Logs

```bash
# View live logs
supabase functions logs invite-user --follow

# View recent logs
supabase functions logs invite-user
```

---

## Environment Variables

The function automatically has access to:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Automatically injected by Supabase

No additional setup needed! 🎉

---

## Troubleshooting

**Function not found:**
```bash
# List all deployed functions
supabase functions list
```

**Permission denied:**
```bash
# Ensure you're logged in
supabase login

# Re-link project
supabase link --project-ref your-project-ref
```

**Email not sending:**
1. Check Supabase Dashboard → Authentication → Email Templates
2. Ensure "Invite user" template is enabled
3. Check function logs for errors
