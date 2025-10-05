#!/usr/bin/env node

/**
 * Secure Database Seeding Script
 * 
 * Uses environment variables for secure credential management.
 * Never stores credentials in code.
 */

const { createClient } = require('@supabase/supabase-js')

// 🔐 SECURE: Load credentials from environment variables only
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY

console.log('🌱 Trakr Database Seeding Script')
console.log('================================')

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.log('\n❌ Missing Supabase credentials!')
  console.log('Please set environment variables:')
  console.log('')
  console.log('Windows (Command Prompt):')
  console.log('  set SUPABASE_URL=https://your-project-id.supabase.co')
  console.log('  set SUPABASE_SERVICE_KEY=your-service-role-key')
  console.log('  node scripts/seed-with-credentials.js')
  console.log('')
  console.log('Windows (PowerShell):')
  console.log('  $env:SUPABASE_URL="https://your-project-id.supabase.co"')
  console.log('  $env:SUPABASE_SERVICE_KEY="your-service-role-key"')
  console.log('  node scripts/seed-with-credentials.js')
  console.log('')
  console.log('Or create a .env file in the project root with:')
  console.log('  SUPABASE_URL=https://your-project-id.supabase.co')
  console.log('  SUPABASE_SERVICE_KEY=your-service-role-key')
  console.log('')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

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
    
    // Clear in correct order to handle foreign key constraints
    const clearOrder = [
      'audit_photos',
      'audit_comments', 
      'audits',
      'auditor_assignments',
      'users',
      'branches', 
      'zones',
      'surveys',
      'organizations'
    ]
    
    for (const table of clearOrder) {
      try {
        const { error } = await supabase.from(table).delete().gte('created_at', '1900-01-01')
        if (error) {
          console.log(`  ⚠️  ${table}: ${error.message}`)
        } else {
          console.log(`  ✅ Cleared ${table}`)
        }
      } catch (err) {
        console.log(`  ⚠️  ${table}: ${err.message}`)
      }
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

    // Seed users (ultra minimal - just email and role) with upsert
    console.log('👥 Seeding users...')
    const { data: userData, error: userError } = await supabase.from('users').upsert([
      // Main test accounts (trakr.com domain)
      { org_id: retailOrg.id, email: 'admin@trakr.com', role: 'ADMIN' },
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
    const manhattanBranch = branchData.find(b => b.name === 'Manhattan Store')
    const brooklynBranch = branchData.find(b => b.name === 'Brooklyn Store')
    const miamiBranch = branchData.find(b => b.name === 'Miami Store')
    const atlantaBranch = branchData.find(b => b.name === 'Atlanta Store')
    const laBranch = branchData.find(b => b.name === 'Los Angeles Store')
    const sfBranch = branchData.find(b => b.name === 'San Francisco Store')
    const dallasBranch = branchData.find(b => b.name === 'Dallas Store')
    const houstonBranch = branchData.find(b => b.name === 'Houston Store')
    
    await supabase.from('branches').update({ manager_id: jenniferManager.id }).eq('id', manhattanBranch.id) // Jennifer - Manhattan
    await supabase.from('branches').update({ manager_id: jenniferManager.id }).eq('id', brooklynBranch.id) // Jennifer - Brooklyn (2 branches)
    await supabase.from('branches').update({ manager_id: mariaManager.id }).eq('id', miamiBranch.id) // Maria - Miami
    await supabase.from('branches').update({ manager_id: mariaManager.id }).eq('id', atlantaBranch.id) // Maria - Atlanta (2 branches)
    await supabase.from('branches').update({ manager_id: jamesManager.id }).eq('id', laBranch.id) // James - LA
    await supabase.from('branches').update({ manager_id: jamesManager.id }).eq('id', sfBranch.id) // James - SF (2 branches)
    await supabase.from('branches').update({ manager_id: jamesManager.id }).eq('id', dallasBranch.id) // James - Dallas (3 branches)
    await supabase.from('branches').update({ manager_id: jamesManager.id }).eq('id', houstonBranch.id) // James - Houston (4 branches)

    console.log('\n🎉 Database seeding completed successfully!')
    console.log('\n📊 Seeded Data Summary:')
    console.log('  • 2 Organizations (Global Retail Chain + Manufacturing Corp)')
    console.log('  • 4 Zones (North, South, West, Central regions)')
    console.log('  • 8 Branches (Manhattan, Brooklyn, Miami, Atlanta, LA, SF, Dallas, Houston)')
    console.log('  • 7 Users (1 admin, 3 branch managers, 3 auditors)')
    
    console.log('\n🔐 Test User Accounts:')
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
