// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
// Allow invocation from browser without Supabase Auth session
export const config = {
  auth: { verify_jwt: false }
}
import { createClient } from "jsr:@supabase/supabase-js@2"

function startOfDay(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0) }
function endOfDay(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999) }
function startOfWeekGeneric(d: Date, weekStartsOn: 0 | 1 = 1): Date {
  const day = d.getDay()
  const diff = (day - weekStartsOn + 7) % 7
  const s = new Date(d)
  s.setDate(d.getDate() - diff)
  s.setHours(0, 0, 0, 0)
  return s
}
function endOfWeekGeneric(d: Date, weekStartsOn: 0 | 1 = 1): Date {
  const s = startOfWeekGeneric(d, weekStartsOn)
  const e = new Date(s)
  e.setDate(s.getDate() + 6)
  e.setHours(23, 59, 59, 999)
  return e
}
function getOrgLocalNow(tz: string | null | undefined, now: Date): Date {
  try {
    return new Date(now.toLocaleString("en-US", { timeZone: tz || "UTC" }))
  } catch {
    return new Date(now)
  }
}
function getWeeklyRange(now: Date, tz: string | null | undefined, weekStartsOn: 0 | 1 | null | undefined): { start: Date; end: Date } {
  const orgNow = getOrgLocalNow(tz, now)
  const w = ((weekStartsOn as any) ?? 1) as 0 | 1
  const localStart = startOfWeekGeneric(orgNow, w)
  const localEnd = endOfWeekGeneric(orgNow, w)
  const delta = orgNow.getTime() - now.getTime()
  return { start: new Date(localStart.getTime() - delta), end: new Date(localEnd.getTime() - delta) }
}

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  }
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  const url = new URL(req.url)
  const qOrg = url.searchParams.get("org_id") || undefined
  const qSurvey = url.searchParams.get("survey_id") || undefined
  let body: any = {}
  try { body = await req.json(); } catch {}
  const orgId = body?.org_id || qOrg
  const surveyId = body?.survey_id || qSurvey
  const dryRun = Boolean(body?.dry_run)

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Missing service env" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
  const admin = createClient(supabaseUrl, serviceKey)

  const now = new Date()
  const summary: any = { created: 0, skipped: 0, orgs: [] as any[] }

  const orgQuery = orgId ? admin.from("organizations").select("*").eq("id", orgId) : admin.from("organizations").select("*")
  const { data: orgs, error: orgErr } = await orgQuery
  if (orgErr) return new Response(JSON.stringify({ error: orgErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  for (const org of orgs || []) {
    const { start, end } = getWeeklyRange(now, (org as any).time_zone, (org as any).week_starts_on as 0 | 1)

    let sQ = admin
      .from("surveys")
      .select("id, org_id, version, is_active, frequency, applicable_branch_ids")
      .eq("org_id", org.id)
      .eq("is_active", true)
    if (surveyId) {
      sQ = sQ.eq("id", surveyId)
    } else {
      sQ = sQ.eq("frequency", "WEEKLY")
    }
    const { data: surveys, error: sErr } = await sQ
    if (sErr) return new Response(JSON.stringify({ error: sErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    const orgResult = { orgId: org.id, created: 0, skipped: 0, surveys: [] as any[] }

    for (const s of surveys || []) {
      // If survey_id provided but survey isn't weekly, skip (avoids race conditions while still being safe)
      if (!surveyId && (s as any).frequency !== "WEEKLY") continue
      if (surveyId && (s as any).frequency !== "WEEKLY") continue
      let branchIds: string[] = []
      const applicable: string[] = (s as any).applicable_branch_ids || []
      if (applicable && applicable.length > 0) {
        branchIds = applicable
      } else {
        const { data: bs, error: bErr } = await admin.from("branches").select("id, manager_id").eq("org_id", org.id)
        if (bErr) return new Response(JSON.stringify({ error: bErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
        branchIds = (bs || []).map((b: any) => b.id)
      }

      const surveyResult = { surveyId: s.id, created: 0, skipped: 0 }

      for (const branchId of branchIds) {
        const startIso = start.toISOString()
        const endIso = end.toISOString()
        const { data: existing, error: eErr } = await admin
          .from("audits")
          .select("id,status,due_at,period_start,period_end")
          .eq("org_id", org.id)
          .eq("survey_id", s.id)
          .eq("branch_id", branchId)
          .eq("is_archived", false)
          .eq("period_start", startIso)
          .eq("period_end", endIso)
        if (eErr) return new Response(JSON.stringify({ error: eErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })

        const hasActive = (existing || []).some((a: any) => a.status !== "REJECTED" && new Date(a.due_at || a.period_end).getTime() > now.getTime())
        if (hasActive) {
          summary.skipped++; orgResult.skipped++; surveyResult.skipped++
          continue
        }

        let assignedTo: string | null = null
        
        // Check auditor_assignments table (supports both direct branch assignments and zone-based assignments)
        const { data: assigns } = await admin
          .from("auditor_assignments")
          .select("user_id, branch_ids, zone_ids")
          .eq("org_id", org.id)
        
        // Find auditor assigned to this branch (either directly or via zone)
        if (assigns && assigns.length > 0) {
          // First, get branch's zone (if any)
          const { data: zoneBranches } = await admin
            .from("zone_branches")
            .select("zone_id")
            .eq("branch_id", branchId)
          const branchZoneIds = (zoneBranches || []).map((zb: any) => zb.zone_id)
          
          // Find first auditor assigned to this branch (direct or via zone)
          for (const assign of assigns) {
            const branchIds = assign.branch_ids || []
            const zoneIds = assign.zone_ids || []
            
            // Check direct branch assignment
            if (branchIds.includes(branchId)) {
              assignedTo = assign.user_id as string
              break
            }
            
            // Check zone assignment
            if (branchZoneIds.length > 0 && zoneIds.some((zid: string) => branchZoneIds.includes(zid))) {
              assignedTo = assign.user_id as string
              break
            }
          }
        }
        
        // Skip creation if no explicit auditor assignment exists
        if (!assignedTo) { summary.skipped++; orgResult.skipped++; surveyResult.skipped++; continue }

        if (!dryRun) {
          const nowIso = new Date().toISOString()
          const payload: any = {
            org_id: org.id,
            branch_id: branchId,
            survey_id: s.id,
            survey_version: (s as any).version ?? 1,
            assigned_to: assignedTo,
            status: "DRAFT",
            responses: {},
            na_reasons: {},
            section_comments: {},
            created_at: nowIso,
            updated_at: nowIso,
            period_start: startIso,
            period_end: endIso,
            due_at: endIso,
            is_archived: false,
            created_origin: 'SYSTEM_SCHEDULED',
          }
          const { error: insErr } = await admin.from("audits").insert(payload)
          if (insErr) {
            return new Response(JSON.stringify({ error: insErr.message, at: "insert" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
          }
        }

        summary.created++; orgResult.created++; surveyResult.created++
      }

      orgResult.surveys.push(surveyResult)
    }

    summary.orgs.push(orgResult)
  }

  return new Response(JSON.stringify(summary), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
})
