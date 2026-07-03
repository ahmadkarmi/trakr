import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Max resend attempts per org per hour
const RESEND_RATE_LIMIT = 20

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) throw new Error('Unauthorized')

    const { data: callerData } = await supabase
      .from('users')
      .select('id, role, org_id')
      .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
      .single()

    if (!callerData || !['ADMIN', 'SUPER_ADMIN'].includes(callerData.role)) {
      throw new Error('Only admins can resend invitations')
    }

    const { userId } = await req.json()
    if (!userId) throw new Error('Missing required field: userId')

    // Look up target user
    const { data: targetUser, error: lookupError } = await supabase
      .from('users')
      .select('email, full_name, role, org_id')
      .eq('id', userId)
      .single()

    if (lookupError || !targetUser) throw new Error('User not found')

    // Admins can only resend within their own org
    if (callerData.role === 'ADMIN' && callerData.org_id !== targetUser.org_id) {
      throw new Error('Admins can only resend invitations within their own organization')
    }

    // Rate limit: max RESEND_RATE_LIMIT resends per org per hour, counted from
    // logged resend events (user-row updated_at matched any profile edit)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: recentCount } = await supabase
      .from('activity_logs')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', targetUser.org_id)
      .eq('action', 'invite_resent')
      .gte('created_at', oneHourAgo)

    if ((recentCount ?? 0) >= RESEND_RATE_LIMIT) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded: max ${RESEND_RATE_LIMIT} resends per hour per organization`, success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      )
    }

    // Generate a new invite link
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email: targetUser.email,
      options: {
        data: {
          name: targetUser.full_name,
          role: targetUser.role,
          org_id: targetUser.org_id,
        },
        redirectTo: `${req.headers.get('origin')}/login`,
      },
    })

    if (linkError) throw new Error(`Failed to generate invite link: ${linkError.message}`)

    // generateLink does NOT send email — without a configured sender the resend
    // would silently deliver nothing, so fail loudly instead
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      return new Response(
        JSON.stringify({ error: 'Email delivery is not configured (RESEND_API_KEY missing) — invitation was not sent', success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      )
    }
    {
      const { Resend } = await import('npm:resend@2.0.0')
      const resend = new Resend(resendKey)
      const fromEmail = Deno.env.get('SMTP_SENDER_EMAIL') || 'noreply@yourdomain.com'

      const { error: emailError } = await resend.emails.send({
        from: `Trakr <${fromEmail}>`,
        to: targetUser.email,
        subject: `Your Trakr invitation`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #4F46E5;">Trakr</h1>
            <p>Hi ${targetUser.full_name || targetUser.email},</p>
            <p>Your invitation to join Trakr as <strong>${targetUser.role}</strong> has been resent.</p>
            <div style="margin: 30px 0;">
              <a href="${linkData.properties.action_link}"
                 style="display: inline-block; padding: 14px 28px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
                Accept Invitation
              </a>
            </div>
            <p style="color: #6b7280; font-size: 13px;">This link expires in 24 hours.</p>
          </div>
        `,
      })

      if (emailError) throw new Error(`Failed to send email: ${emailError.message}`)
    }

    await supabase.from('activity_logs').insert({
      org_id: targetUser.org_id,
      user_id: callerData.id,
      action: 'invite_resent',
      entity_type: 'user',
      entity_id: userId,
      details: `Resent invitation to ${targetUser.email}`,
    })

    return new Response(
      JSON.stringify({ success: true, message: `Invitation resent to ${targetUser.email}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An error occurred', success: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
