import { createClient } from 'jsr:@supabase/supabase-js@2'
import { Resend } from 'npm:resend@2.0.0'
import { corsHeaders } from '../_shared/cors.ts'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) throw new Error('Unauthorized')

    // Check admin role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || !['ADMIN', 'SUPER_ADMIN'].includes(userData.role)) {
      throw new Error('Only admins can invite users')
    }

    const { email, name, role, orgId } = await req.json()

    // Generate magic link via Supabase
    const { data: magicLinkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        data: { name, role, org_id: orgId },
        redirectTo: `${req.headers.get('origin')}/login`
      }
    })

    if (linkError) throw new Error(`Failed to generate magic link: ${linkError.message}`)

    // Send email via Resend with YOUR branding
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Trakr <noreply@yourdomain.com>', // ✅ YOUR EMAIL
      to: email,
      subject: `You're invited to join Trakr`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4F46E5; margin: 0;">Trakr</h1>
          </div>
          
          <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <h2 style="margin-top: 0; color: #111827;">Welcome to Trakr!</h2>
            <p style="color: #374151; line-height: 1.6;">Hi ${name},</p>
            <p style="color: #374151; line-height: 1.6;">
              You've been invited to join Trakr as a <strong>${role}</strong>. 
              Click the button below to set up your account and get started.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${magicLinkData.properties.action_link}" 
                 style="display: inline-block; padding: 14px 28px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">
                Accept Invitation
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              Or copy and paste this link into your browser:
            </p>
            <p style="color: #4F46E5; font-size: 12px; word-break: break-all; background: white; padding: 10px; border-radius: 4px; margin-top: 10px;">
              ${magicLinkData.properties.action_link}
            </p>
          </div>
          
          <div style="text-align: center; color: #9ca3af; font-size: 12px;">
            <p>This invitation will expire in 24 hours.</p>
            <p>If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
        </div>
      `
    })

    if (emailError) throw new Error(`Failed to send email: ${emailError.message}`)

    // Create user in database
    const { data: newUser, error: dbError } = await supabase
      .from('users')
      .insert({
        email,
        full_name: name,
        role: role.toUpperCase(),
        org_id: orgId,
        email_verified: false,
        is_active: true,
      })
      .select()
      .single()

    if (dbError) throw new Error(`Failed to create user: ${dbError.message}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        user: newUser,
        emailId: emailData?.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
