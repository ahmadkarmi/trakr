#!/usr/bin/env node

/**
 * Secure Database Seeding Script
 * 
 * Uses environment variables for secure credential management.
 * Never stores credentials in code.
 */

const { createClient } = require('@supabase/supabase-js')
const { ensureEnvSet, formatMissing } = require('./utils/env')

// Validate environment variables before continuing
const { resolved: envVars, missing: missingEnv, usedKeys } = ensureEnvSet('scripts')

if (missingEnv.length > 0) {
  console.log('\n❌ Missing Supabase credentials!')
  console.log('Please set the following environment variables:')
  console.log(formatMissing(missingEnv))
  console.log('\nYou can set them via shell exports or by creating a .env file in the project root.')
  process.exit(1)
}

const SUPABASE_URL = envVars.SUPABASE_URL
const SUPABASE_KEY = envVars.SUPABASE_SERVICE_KEY

console.log('🌱 Trakr Database Seeding Script')
console.log('================================')

if (usedKeys.SUPABASE_SERVICE_KEY && usedKeys.SUPABASE_SERVICE_KEY !== 'SUPABASE_SERVICE_KEY') {
  console.log('⚠️  Using fallback key for SUPABASE_SERVICE_KEY (' + usedKeys.SUPABASE_SERVICE_KEY + '). Operations may be limited.')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// supabase-js returns query failures as { error }, it does not throw them -
// silently ignoring that field (as the cleanup steps below used to) means a
// blocked delete (e.g. an FK constraint from a leftover row) logs a false
// "cleared" and the script proceeds to insert duplicate orgs/users on top of
// the undeleted ones. A missing table is the one error worth tolerating,
// since it just means the table isn't there yet on a fresh/partial DB - but
// Postgres and PostgREST phrase that differently ("relation ... does not
// exist" vs. PostgREST's own "Could not find the table ... in the schema
// cache"), so check for both rather than just the one observed first.
// Returns true if the delete actually happened, false if benignly skipped.
function assertCleared(table, error) {
  if (!error) return true
  // Match only MISSING-TABLE wordings. A bare includes('does not exist')
  // used to also swallow "column X does not exist" - which is how the old
  // created_at-filtered deletes on zone_branches/audit_photos silently
  // no-opped on every run while logging ERRORs in Postgres.
  if (error.message && (/relation .* does not exist/.test(error.message) || error.message.includes('Could not find the table'))) {
    console.log(`  ⚠️  ${table} does not exist yet, skipping`)
    return false
  }
  throw new Error(`Failed to clear ${table}: ${error.message}`)
}

// Orgs the e2e reseed must never touch: the persistent browser-QA sandbox
// (see scripts/seed-qa-org.mjs). Everything else is fair game.
const PRESERVED_ORG_NAMES = ['Trakr QA Sandbox']

async function seedDatabase() {
  // Test connection and check schema
  console.log('🔌 Testing connection...')
  const { data, error } = await supabase.from('organizations').select('count').limit(1)
  if (error && !error.message.includes('does not exist')) {
    throw error
  }
  console.log('✅ Connection successful')
  
  // Check what columns exist in key tables
  console.log('🔍 Checking table schemas...')
  try {
    const { data: sampleBranch } = await supabase.from('branches').select('*').limit(1)
    if (sampleBranch && sampleBranch.length > 0) {
      console.log('📋 Branches columns:', Object.keys(sampleBranch[0]).join(', '))
    }
  } catch (err) {
    console.log('⚠️  Could not check branches schema:', err.message)
  }
  
  try {
    const { data: sampleUser } = await supabase.from('users').select('*').limit(1)
    if (sampleUser && sampleUser.length > 0) {
      console.log('👤 Users columns:', Object.keys(sampleUser[0]).join(', '))
    }
  } catch (err) {
    console.log('⚠️  Could not check users schema:', err.message)
  }

  try {
    // Clear existing data more thoroughly
    console.log('🧹 Clearing existing data...')

    // Resolve orgs the reseed must preserve (the persistent QA sandbox).
    // All clears below exclude these org ids, so browser-QA data survives
    // every CI e2e run instead of needing seed:qa after each one.
    const { data: preservedOrgs, error: preservedErr } = await supabase
      .from('organizations').select('id, name').in('name', PRESERVED_ORG_NAMES)
    if (preservedErr && !/relation .* does not exist/.test(preservedErr.message || '')) throw preservedErr
    const preservedOrgIds = (preservedOrgs || []).map(o => o.id)
    if (preservedOrgIds.length) {
      console.log(`  🛡️  Preserving org(s): ${(preservedOrgs || []).map(o => o.name).join(', ')}`)
    }

    // Filter helper: delete/update everything EXCEPT preserved orgs' rows.
    // NULL org_id rows must still match (PostgREST neq drops NULLs), hence
    // the or(). With nothing to preserve, match all rows via a tautology
    // that works on every table regardless of its columns.
    const exceptPreserved = (query, col = 'org_id') =>
      preservedOrgIds.length
        ? query.or(`${col}.is.null,${col}.not.in.(${preservedOrgIds.join(',')})`)
        : query.or(`${col}.is.null,${col}.not.is.null`)

    // A DB trigger rejects removing an auditor's assignment from any branch
    // that's currently is_active=true ("Deactivate the branch first") - the
    // steady-state result of a prior successful seed run is exactly that
    // (active branches with assigned auditors), so clearing auditor_assignments
    // below would otherwise always fail on the second and every later run.
    const { error: deactivateError } = await exceptPreserved(supabase.from('branches').update({ is_active: false }))
    if (assertCleared('branches.is_active', deactivateError)) console.log('  ✅ Deactivated branches (non-preserved)')

    // Clear in order that respects foreign key constraints. Tables whose
    // rows die via ON DELETE CASCADE are deliberately absent:
    //   audit_photos  -> cascades from audits
    //   zone_branches -> cascades from zones/branches
    //   notifications -> cascades from users
    // (audit_comments has no table in the live schema at all.)
    // activity_logs/data_access_audit/auditor_branch_assignments/
    // zone_assignments hold NO ACTION FKs on org_id/user_id/created_by and
    // must be cleared explicitly before users/organizations.
    const clearOrder = [
      'activity_logs',
      'data_access_audit',
      'audits',
      'auditor_assignments',
      'auditor_branch_assignments',
      'zone_assignments',
      'surveys',
    ]

    for (const table of clearOrder) {
      const { error } = await exceptPreserved(supabase.from(table).delete())
      if (assertCleared(table, error)) console.log(`  ✅ Cleared ${table}`)
    }

    // Clear FK-constrained tables in correct order
    // 1. Remove branch managers (set to NULL)
    const { error: managerNullError } = await exceptPreserved(supabase.from('branches').update({ manager_id: null }))
    if (assertCleared('branches.manager_id', managerNullError)) console.log('  ✅ Nullified branch managers')

    // 2. Delete users
    const { error: usersError } = await exceptPreserved(supabase.from('users').delete())
    if (assertCleared('users', usersError)) console.log('  ✅ Cleared users')

    // 3. Delete branches
    const { error: branchesError } = await exceptPreserved(supabase.from('branches').delete())
    if (assertCleared('branches', branchesError)) console.log('  ✅ Cleared branches')

    // 4. Delete zones
    const { error: zonesError } = await exceptPreserved(supabase.from('zones').delete())
    if (assertCleared('zones', zonesError)) console.log('  ✅ Cleared zones')

    // 5. Delete organizations
    const { error: orgsError } = preservedOrgIds.length
      ? await supabase.from('organizations').delete().not('id', 'in', `(${preservedOrgIds.join(',')})`)
      : await supabase.from('organizations').delete().gte('created_at', '1900-01-01')
    if (assertCleared('organizations', orgsError)) console.log('  ✅ Cleared organizations')

    // Ensure every seeded user has an auth account. On the long-lived shared
    // project most already exist; on a fresh project (e.g. a dedicated e2e
    // database) this bootstraps them so the seed is fully self-contained.
    // MUST run BEFORE the public.users upsert below: handle_new_user() fires
    // on auth-user creation and inserts a public.users row keyed on the auth
    // id - if a row with the same email already exists under a different id,
    // the trigger hits the users email unique constraint and GoTrue returns
    // an opaque 500. Created first, the trigger's rows simply get their
    // org/role filled in by the email-conflict upsert. Password matches
    // scripts/set-user-passwords.js's default so the vitest integration
    // suites' signInWithPassword works out of the box.
    console.log('👤 Ensuring auth accounts exist...')
    const SEED_USER_PASSWORD = process.env.SEED_USER_PASSWORD || 'Password@123'
    const SEED_AUTH_EMAILS = [
      'admin@trakr.com', 'branchmanager@trakr.com', 'auditor@trakr.com',
      'admin@retailchain.com', 'manager.manhattan@retailchain.com',
      'manager.miami@retailchain.com', 'manager.la@retailchain.com',
      'auditor1@retailchain.com', 'auditor2@retailchain.com', 'auditor3@retailchain.com',
    ]
    const { data: preList, error: preListError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    if (preListError) throw preListError
    const existingAuthEmails = new Set((preList.users || []).map(u => (u.email || '').toLowerCase()))
    for (const email of SEED_AUTH_EMAILS) {
      if (existingAuthEmails.has(email.toLowerCase())) continue
      const { error: createErr } = await supabase.auth.admin.createUser({
        email,
        password: SEED_USER_PASSWORD,
        email_confirm: true,
      })
      if (createErr) throw new Error(`Failed to create auth user ${email}: ${createErr.name || ''} ${createErr.status || ''} ${createErr.message}`)
      console.log(`  ✅ Created auth account for ${email}`)
    }

    // Seed organizations
    console.log('🏢 Seeding organizations...')
    const { data: orgData, error: orgError } = await supabase.from('organizations').insert([
      { name: 'Global Retail Chain' },
      { name: 'Manufacturing Corp' }
    ]).select()
    if (orgError) throw orgError
    
    const retailOrg = orgData.find(org => org.name === 'Global Retail Chain')
    const manufacturingOrg = orgData.find(org => org.name === 'Manufacturing Corp')

    // Seed zones
    console.log('🗺️ Seeding zones...')
    const { data: zoneData, error: zoneError } = await supabase.from('zones').insert([
      { org_id: retailOrg.id, name: 'North Region', description: 'Northern region covering NY, NJ, CT' },
      { org_id: retailOrg.id, name: 'South Region', description: 'Southern region covering FL, GA, SC' },
      { org_id: retailOrg.id, name: 'West Region', description: 'Western region covering CA, NV, AZ' },
      { org_id: retailOrg.id, name: 'Central Region', description: 'Central region covering TX, OK, KS' }
    ]).select()
    if (zoneError) throw zoneError
    
    const northZone = zoneData.find(z => z.name === 'North Region')
    const southZone = zoneData.find(z => z.name === 'South Region')
    const westZone = zoneData.find(z => z.name === 'West Region')
    const centralZone = zoneData.find(z => z.name === 'Central Region')

    // Seed branches (ultra minimal - just org_id and name)
    console.log('🏪 Seeding branches...')
    const { data: branchData, error: branchError } = await supabase.from('branches').insert([
      { org_id: retailOrg.id, name: 'Manhattan Store' },
      { org_id: retailOrg.id, name: 'Brooklyn Store' },
      { org_id: retailOrg.id, name: 'Miami Store' },
      { org_id: retailOrg.id, name: 'Atlanta Store' },
      { org_id: retailOrg.id, name: 'Los Angeles Store' },
      { org_id: retailOrg.id, name: 'San Francisco Store' },
      { org_id: retailOrg.id, name: 'Dallas Store' },
      { org_id: retailOrg.id, name: 'Houston Store' }
    ]).select()
    if (branchError) throw branchError

    // Assign branches to zones
    const manhattanBranch = branchData.find(b => b.name === 'Manhattan Store')
    const brooklynBranch = branchData.find(b => b.name === 'Brooklyn Store')
    const miamiBranch = branchData.find(b => b.name === 'Miami Store')
    const atlantaBranch = branchData.find(b => b.name === 'Atlanta Store')
    const laBranch = branchData.find(b => b.name === 'Los Angeles Store')
    const sfBranch = branchData.find(b => b.name === 'San Francisco Store')
    const dallasBranch = branchData.find(b => b.name === 'Dallas Store')
    const houstonBranch = branchData.find(b => b.name === 'Houston Store')
    
    try {
      await supabase.from('zone_branches').insert([
        { zone_id: northZone.id, branch_id: manhattanBranch.id },
        { zone_id: northZone.id, branch_id: brooklynBranch.id },
        { zone_id: southZone.id, branch_id: miamiBranch.id },
        { zone_id: southZone.id, branch_id: atlantaBranch.id },
        { zone_id: westZone.id, branch_id: laBranch.id },
        { zone_id: westZone.id, branch_id: sfBranch.id },
        { zone_id: centralZone.id, branch_id: dallasBranch.id },
        { zone_id: centralZone.id, branch_id: houstonBranch.id }
      ])
      console.log('  ✅ Branches assigned to zones')
    } catch (err) {
      console.log(`  ⚠️  zone_branches: ${err.message}`)
    }

    // Seed users (ultra minimal - just email and role) with upsert
    console.log('👥 Seeding users...')
    const { data: userData, error: userError } = await supabase.from('users').upsert([
      // Main test accounts (trakr.com domain)
      { org_id: retailOrg.id, email: 'admin@trakr.com', role: 'SUPER_ADMIN' },
      { org_id: retailOrg.id, email: 'branchmanager@trakr.com', role: 'BRANCH_MANAGER' },
      { org_id: retailOrg.id, email: 'auditor@trakr.com', role: 'AUDITOR' },
      
      // Additional test accounts (retailchain.com domain)
      { org_id: retailOrg.id, email: 'admin@retailchain.com', role: 'ADMIN' },
      { org_id: retailOrg.id, email: 'manager.manhattan@retailchain.com', role: 'BRANCH_MANAGER' },
      { org_id: retailOrg.id, email: 'manager.miami@retailchain.com', role: 'BRANCH_MANAGER' },
      { org_id: retailOrg.id, email: 'manager.la@retailchain.com', role: 'BRANCH_MANAGER' },
      { org_id: retailOrg.id, email: 'auditor1@retailchain.com', role: 'AUDITOR' },
      { org_id: retailOrg.id, email: 'auditor2@retailchain.com', role: 'AUDITOR' },
      { org_id: retailOrg.id, email: 'auditor3@retailchain.com', role: 'AUDITOR' }
    ], { 
      onConflict: 'email',
      ignoreDuplicates: false 
    }).select()
    if (userError) throw userError
    
    const mainBranchManager = userData.find(u => u.email === 'branchmanager@trakr.com')
    const jenniferManager = userData.find(u => u.email === 'manager.manhattan@retailchain.com')
    const mariaManager = userData.find(u => u.email === 'manager.miami@retailchain.com')
    const jamesManager = userData.find(u => u.email === 'manager.la@retailchain.com')

    // Update branch managers
    console.log('🔄 Assigning branch managers...')
    await supabase.from('branches').update({ manager_id: jenniferManager.id }).eq('id', manhattanBranch.id) // Jennifer - Manhattan
    await supabase.from('branches').update({ manager_id: jenniferManager.id }).eq('id', brooklynBranch.id) // Jennifer - Brooklyn (2 branches)
    await supabase.from('branches').update({ manager_id: mariaManager.id }).eq('id', miamiBranch.id) // Maria - Miami
    await supabase.from('branches').update({ manager_id: mariaManager.id }).eq('id', atlantaBranch.id) // Maria - Atlanta (2 branches)
    await supabase.from('branches').update({ manager_id: jamesManager.id }).eq('id', laBranch.id) // James - LA
    await supabase.from('branches').update({ manager_id: jamesManager.id }).eq('id', sfBranch.id) // James - SF (2 branches)
    await supabase.from('branches').update({ manager_id: jamesManager.id }).eq('id', dallasBranch.id) // James - Dallas (3 branches)
    await supabase.from('branches').update({ manager_id: jamesManager.id }).eq('id', houstonBranch.id) // James - Houston (4 branches)

    // Assign auditors to zones for branch coverage
    console.log('🔍 Assigning auditor coverage...')
    const auditor1 = userData.find(u => u.email === 'auditor1@retailchain.com')
    const auditor2 = userData.find(u => u.email === 'auditor2@retailchain.com')
    const auditor3 = userData.find(u => u.email === 'auditor3@retailchain.com')
    
    if (auditor1 && auditor2 && auditor3) {
      await supabase.from('auditor_assignments').insert([
        { auditor_id: auditor1.id, zone_id: northZone.id },
        { auditor_id: auditor2.id, zone_id: southZone.id },
        { auditor_id: auditor3.id, zone_id: westZone.id },
        { auditor_id: auditor3.id, zone_id: centralZone.id }
      ])
      console.log('  ✅ Auditors assigned to zones')
    }

    // Create a basic survey for analytics testing
    console.log('📋 Creating test survey...')
    try {
      const { data: surveyData, error: surveyError } = await supabase.from('surveys').insert([
        {
          org_id: retailOrg.id,
          title: 'Store Compliance Audit',
          description: 'Standard compliance audit for retail locations',
          frequency: 'MONTHLY',
          is_active: true
        }
      ]).select()
      
      if (!surveyError && surveyData && surveyData[0]) {
        console.log('  ✅ Created test survey:', surveyData[0].title)
      }
    } catch (err) {
      console.log(`  ⚠️  Survey creation: ${err.message}`)
    }

    console.log('\n🎉 Database seeding completed successfully!')
    console.log('\n📊 Seeded Data Summary:')
    console.log('  • 2 Organizations (Global Retail Chain + Manufacturing Corp)')
    console.log('  • 4 Zones (North, South, West, Central regions)')
    console.log('  • 8 Branches (Manhattan, Brooklyn, Miami, Atlanta, LA, SF, Dallas, Houston)')
    console.log('  • 7 Users (1 admin, 3 branch managers, 3 auditors)')
    
    // Link freshly seeded public.users rows to their auth accounts. The seed
    // recreates rows with new ids; without auth_user_id the org-scoped RLS
    // policies hide every row from the logged-in user and login fails.
    console.log('\n🔗 Linking users to auth accounts...')
    const { data: authList, error: authListError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    if (authListError) throw authListError
    let linked = 0
    for (const authUser of authList.users) {
      if (!authUser.email) continue
      const { data: updated, error: linkError } = await supabase
        .from('users')
        .update({ auth_user_id: authUser.id })
        .ilike('email', authUser.email)
        .select('id')
      if (linkError) throw linkError
      linked += (updated || []).length
    }
    console.log(`✅ Linked ${linked} user rows to auth accounts`)

    console.log('\n🔐 Test User Accounts:')
    console.log('  Super Admin: admin@trakr.com')
    console.log('  Admin: admin@retailchain.com')
    console.log('  Branch Manager (2 branches): manager.manhattan@retailchain.com')
    console.log('  Branch Manager (2 branches): manager.miami@retailchain.com')
    console.log('  Branch Manager (4 branches): manager.la@retailchain.com')
    console.log('  Auditor: auditor1@retailchain.com')
    
    console.log('\n🎯 Multiple Branch Manager Testing Ready!')
    console.log('  • Jennifer Lee manages 2 branches (Manhattan + Brooklyn)')
    console.log('  • Maria Garcia manages 2 branches (Miami + Atlanta)')
    console.log('  • James Anderson manages 4 branches (LA + SF + Dallas + Houston)')
    console.log('  • Analytics will show real data for each manager scope')
    console.log('  • Role-based access control fully configured')

  } catch (error) {
    console.error('❌ Seeding failed:', error.message)
    if (error.details) {
      console.error('Details:', error.details)
    }
    if (error.hint) {
      console.error('Hint:', error.hint)
    }
    process.exit(1)
  }
}

seedDatabase()
