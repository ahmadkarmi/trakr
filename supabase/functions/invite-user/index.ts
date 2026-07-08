// Invite User Edge Function
// Sends invitation emails using Supabase Auth's built-in email system

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Max invites per org per hour to prevent abuse
const INVITE_RATE_LIMIT = 20

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

    // Verify caller is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) throw new Error('Unauthorized')

    // Check caller is admin or super admin
    const { data: callerData } = await supabase
      .from('users')
      .select('id, role, org_id')
      .or(`id.eq.${user.id},auth_user_id.eq.${user.id}`)
      .single()

    if (!callerData || !['ADMIN', 'SUPER_ADMIN'].includes(callerData.role)) {
      throw new Error('Only admins can invite users')
    }

    const { email, name, role, orgId, idempotencyKey } = await req.json()

    if (!email || !name || !role || !orgId) {
      throw new Error('Missing required fields: email, name, role, orgId')
    }

    // Admins can only invite into their own org; super admins can invite into any
    if (callerData.role === 'ADMIN' && callerData.org_id !== orgId) {
      throw new Error('Admins can only invite users into their own organization')
    }

    // Idempotency: the client's retry layer (guardedFetch) re-sends this exact
    // request on 5xx/timeout, including when the invite actually succeeded
    // server-side but the response was lost in transit. If this idempotency
    // key was already processed, return the original result instead of
    // re-inviting (which would otherwise surface as a confusing "user already
    // exists" error even though the admin's request succeeded).
    if (idempotencyKey) {
      const detailsMarker = `Invited ${email} as ${role} [key:${idempotencyKey}]`
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
      const { data: priorInvite } = await supabase
        .from('activity_logs')
        .select('entity_id')
        .eq('org_id', orgId)
        .eq('action', 'user_invited')
        .eq('details', detailsMarker)
        .gte('created_at', tenMinutesAgo)
        .maybeSingle()

      if (priorInvite?.entity_id) {
        const { data: priorUser } = await supabase
          .from('users')
          .select()
          .eq('id', priorInvite.entity_id)
          .maybeSingle()
        if (priorUser) {
          return new Response(
            JSON.stringify({ success: true, user: priorUser, message: `Invitation already sent to ${email}` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          )
        }
      }
    }

    // Rate limit: max INVITE_RATE_LIMIT invites per org per hour, counted from
    // logged invite events (user-row counts also matched signups/edits)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: recentInviteCount } = await supabase
      .from('activity_logs')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('action', 'user_invited')
      .gte('created_at', oneHourAgo)

    if ((recentInviteCount ?? 0) >= INVITE_RATE_LIMIT) {
      return new Response(
        JSON.stringify({ error: `Rate limit exceeded: max ${INVITE_RATE_LIMIT} invites per hour per organization`, success: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      )
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingUser) throw new Error('User with this email already exists')

    // Send invite via Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { name, role, org_id: orgId },
      redirectTo: `${req.headers.get('origin')}/login`
    })

    if (authError) throw new Error(`Failed to send invitation: ${authError.message}`)

    // Fetch the trigger-created user row
    const { data: newUser, error: fetchError } = await supabase
      .from('users')
      .select()
      .eq('id', authUser.user!.id)
      .single()

    if (fetchError || !newUser) {
      await supabase.auth.admin.deleteUser(authUser.user!.id)
      throw new Error('User record not found after invite — trigger may have failed')
    }

    await supabase.from('activity_logs').insert({
      org_id: orgId,
      user_id: callerData.id,
      action: 'user_invited',
      entity_type: 'user',
      entity_id: newUser.id,
      details: idempotencyKey ? `Invited ${email} as ${role} [key:${idempotencyKey}]` : `Invited ${email} as ${role}`,
    })

    return new Response(
      JSON.stringify({ success: true, user: newUser, message: `Invitation sent to ${email}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An error occurred', success: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
