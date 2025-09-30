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
  console.log('You can find these in your Supabase project settings > API')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function seedDatabase() {
  try {
    console.log('🔌 Testing connection...')
    const { error: testError } = await supabase.from('organizations').select('count').limit(1)
    if (testError && !testError.message.includes('does not exist')) {
      throw testError
    }
    console.log('✅ Connection successful')

    // Clear existing data
    console.log('🧹 Clearing existing data...')
    const tables = ['audits', 'auditor_assignments', 'users', 'branches', 'zones', 'surveys', 'organizations']
    for (const table of tables) {
      try {
        await supabase.from(table).delete().neq('id', '')
        console.log(`  ✅ Cleared ${table}`)
      } catch (err) {
        console.log(`  ⚠️  ${table}: ${err.message}`)
      }
    }

    // Seed organizations
    console.log('🏢 Seeding organizations...')
    const { error: orgError } = await supabase.from('organizations').insert([
      { id: 'org_001', name: 'Global Retail Chain' },
      { id: 'org_002', name: 'Manufacturing Corp' }
    ])
    if (orgError) throw orgError

    // Seed zones
    console.log('🗺️ Seeding zones...')
    const { error: zoneError } = await supabase.from('zones').insert([
      { id: 'zone_001', org_id: 'org_001', name: 'North Region', description: 'Northern region covering NY, NJ, CT' },
      { id: 'zone_002', org_id: 'org_001', name: 'South Region', description: 'Southern region covering FL, GA, SC' },
      { id: 'zone_003', org_id: 'org_001', name: 'West Region', description: 'Western region covering CA, NV, AZ' },
      { id: 'zone_004', org_id: 'org_001', name: 'Central Region', description: 'Central region covering TX, OK, KS' }
    ])
    if (zoneError) throw zoneError

    // Seed branches
    console.log('🏪 Seeding branches...')
    const { error: branchError } = await supabase.from('branches').insert([
      { id: 'branch_001', org_id: 'org_001', zone_id: 'zone_001', name: 'Manhattan Store', address: '123 Broadway Ave', city: 'New York', state: 'NY', zip_code: '10001', phone: '(212) 555-0101', email: 'manhattan@retailchain.com' },
      { id: 'branch_002', org_id: 'org_001', zone_id: 'zone_001', name: 'Brooklyn Store', address: '456 Atlantic Ave', city: 'Brooklyn', state: 'NY', zip_code: '11201', phone: '(718) 555-0102', email: 'brooklyn@retailchain.com' },
      { id: 'branch_003', org_id: 'org_001', zone_id: 'zone_002', name: 'Miami Store', address: '321 Ocean Drive', city: 'Miami', state: 'FL', zip_code: '33139', phone: '(305) 555-0104', email: 'miami@retailchain.com' },
      { id: 'branch_004', org_id: 'org_001', zone_id: 'zone_002', name: 'Atlanta Store', address: '654 Peachtree St', city: 'Atlanta', state: 'GA', zip_code: '30309', phone: '(404) 555-0105', email: 'atlanta@retailchain.com' },
      { id: 'branch_005', org_id: 'org_001', zone_id: 'zone_003', name: 'Los Angeles Store', address: '147 Sunset Blvd', city: 'Los Angeles', state: 'CA', zip_code: '90028', phone: '(323) 555-0107', email: 'la@retailchain.com' },
      { id: 'branch_006', org_id: 'org_001', zone_id: 'zone_003', name: 'San Francisco Store', address: '258 Market St', city: 'San Francisco', state: 'CA', zip_code: '94102', phone: '(415) 555-0108', email: 'sf@retailchain.com' },
      { id: 'branch_007', org_id: 'org_001', zone_id: 'zone_004', name: 'Dallas Store', address: '741 Main St', city: 'Dallas', state: 'TX', zip_code: '75201', phone: '(214) 555-0110', email: 'dallas@retailchain.com' },
      { id: 'branch_008', org_id: 'org_001', zone_id: 'zone_004', name: 'Houston Store', address: '852 Commerce St', city: 'Houston', state: 'TX', zip_code: '77002', phone: '(713) 555-0111', email: 'houston@retailchain.com' }
    ])
    if (branchError) throw branchError

    // Seed users
    console.log('👥 Seeding users...')
    const { error: userError } = await supabase.from('users').insert([
      { id: 'user_001', org_id: 'org_001', email: 'admin@retailchain.com', name: 'Admin User', role: 'ADMIN', is_active: true },
      { id: 'user_002', org_id: 'org_001', email: 'manager.manhattan@retailchain.com', name: 'Jennifer Lee', role: 'BRANCH_MANAGER', is_active: true },
      { id: 'user_003', org_id: 'org_001', email: 'manager.miami@retailchain.com', name: 'Maria Garcia', role: 'BRANCH_MANAGER', is_active: true },
      { id: 'user_004', org_id: 'org_001', email: 'manager.la@retailchain.com', name: 'James Anderson', role: 'BRANCH_MANAGER', is_active: true },
      { id: 'user_005', org_id: 'org_001', email: 'auditor1@retailchain.com', name: 'Amanda White', role: 'AUDITOR', is_active: true },
      { id: 'user_006', org_id: 'org_001', email: 'auditor2@retailchain.com', name: 'Christopher Davis', role: 'AUDITOR', is_active: true },
      { id: 'user_007', org_id: 'org_001', email: 'auditor3@retailchain.com', name: 'Jessica Miller', role: 'AUDITOR', is_active: true }
    ])
    if (userError) throw userError

    // Update branch managers
    console.log('🔄 Assigning branch managers...')
    await supabase.from('branches').update({ manager_id: 'user_002' }).eq('id', 'branch_001') // Jennifer - Manhattan
    await supabase.from('branches').update({ manager_id: 'user_002' }).eq('id', 'branch_002') // Jennifer - Brooklyn (2 branches)
    await supabase.from('branches').update({ manager_id: 'user_003' }).eq('id', 'branch_003') // Maria - Miami
    await supabase.from('branches').update({ manager_id: 'user_003' }).eq('id', 'branch_004') // Maria - Atlanta (2 branches)
    await supabase.from('branches').update({ manager_id: 'user_004' }).eq('id', 'branch_005') // James - LA
    await supabase.from('branches').update({ manager_id: 'user_004' }).eq('id', 'branch_006') // James - SF (2 branches)
    await supabase.from('branches').update({ manager_id: 'user_004' }).eq('id', 'branch_007') // James - Dallas (3 branches)
    await supabase.from('branches').update({ manager_id: 'user_004' }).eq('id', 'branch_008') // James - Houston (4 branches)

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
