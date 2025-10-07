// Invite User Edge Function
// Sends invitation emails using Supabase Auth's built-in email system
// Email will come from: noreply@mail.supabase.io (default)
// 
// To use YOUR email domain:
// 1. Go to Supabase Dashboard → Settings → Authentication → SMTP Settings
// 2. Configure your email provider (Gmail, SendGrid, etc.)
// 3. See EMAIL_SENDER_OPTIONS.md for detailed setup

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the request is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Verify the calling user is an admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || !['ADMIN', 'SUPER_ADMIN'].includes(userData.role)) {
      throw new Error('Only admins can invite users')
    }

    // Parse request body
    const { email, name, role, orgId } = await req.json()

    // Validate inputs
    if (!email || !name || !role || !orgId) {
      throw new Error('Missing required fields: email, name, role, orgId')
    }

    // Check if user already exists in auth.users
    const { data: existingAuthUsers } = await supabase.auth.admin.listUsers()
    const userExists = existingAuthUsers?.users.some(u => u.email === email)
    
    if (userExists) {
      throw new Error('User with this email already exists')
    }

    // Invite user via Supabase Auth
    // This automatically sends an invitation email
    // Default: from noreply@mail.supabase.io
    // To customize: Configure SMTP in Supabase Dashboard
    const { data: authUser, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        name,
        role,
        org_id: orgId
      },
      redirectTo: `${req.headers.get('origin')}/login`
    })

    if (authError) {
      throw new Error(`Failed to send invitation: ${authError.message}`)
    }

    // Create user record in our users table
    const { data: newUser, error: dbError } = await supabase
      .from('users')
      .insert({
        id: authUser.user?.id,
        email,
        full_name: name,
        role: role.toUpperCase(),
        org_id: orgId,
        email_verified: false,
        is_active: true,
      })
      .select()
      .single()

    if (dbError) {
      // Rollback: Delete from auth if DB insert fails
      await supabase.auth.admin.deleteUser(authUser.user!.id)
      throw new Error(`Failed to create user record: ${dbError.message}`)
    }

    console.log(`✅ User invited successfully: ${email} as ${role}`)
    console.log(`📧 Email sent from: ${Deno.env.get('SMTP_SENDER_EMAIL') || 'noreply@mail.supabase.io'}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        user: newUser,
        message: `Invitation sent to ${email}`
      }),
      {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Error inviting user:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An error occurred',
        success: false
      }),
      {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 400
      }
    )
  }
})
