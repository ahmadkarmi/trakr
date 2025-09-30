#!/usr/bin/env node

/**
 * Trakr Database Seeding Script
 * 
 * This script populates your Supabase database with realistic test data
 * for comprehensive system testing.
 * 
 * Usage:
 *   node scripts/seed-database.js
 * 
 * Make sure to set your Supabase credentials in environment variables:
 *   SUPABASE_URL=your_supabase_url
 *   SUPABASE_SERVICE_KEY=your_service_role_key
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials!')
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables')
  console.error('You can find these in your Supabase project settings')
  process.exit(1)
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function seedDatabase() {
  console.log('🌱 Starting database seeding...')
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'seed-database.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')
    
    console.log('📄 Executing SQL seed script...')
    
    // Execute the SQL script
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent })
    
    if (error) {
      console.error('❌ Error executing SQL:', error)
      return
    }
    
    console.log('✅ Database seeded successfully!')
    console.log('\n📊 Seeded Data Summary:')
    console.log('  • 2 Organizations (Retail Chain + Manufacturing Corp)')
    console.log('  • 6 Zones (4 retail regions + 2 manufacturing regions)')
    console.log('  • 15 Branches (12 retail stores + 3 manufacturing facilities)')
    console.log('  • 20 Users (1 super admin, 3 admins, 6 branch managers, 10 auditors)')
    console.log('  • 3 Survey Templates (2 retail + 1 manufacturing)')
    console.log('  • 10 Auditor Assignments (covering all branches)')
    console.log('  • 15 Audits (various statuses: completed, in-progress, submitted, overdue)')
    console.log('  • 5 Audit Comments (realistic feedback)')
    console.log('  • 4 Audit Photos (mock evidence photos)')
    
    console.log('\n🔐 Test User Credentials:')
    console.log('  Super Admin: superadmin@retailchain.com')
    console.log('  Admin: admin1@retailchain.com')
    console.log('  Branch Manager: manager.manhattan@retailchain.com')
    console.log('  Auditor: auditor1@retailchain.com')
    console.log('  (Password: Use your Supabase auth setup)')
    
    console.log('\n🎯 Ready for Testing!')
    console.log('  • Analytics dashboards will show real data')
    console.log('  • Multiple branch managers with different branch assignments')
    console.log('  • Auditors with realistic workloads')
    console.log('  • Various audit statuses for comprehensive testing')
    
  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}

// Alternative method using individual inserts if SQL execution fails
async function seedDatabaseAlternative() {
  console.log('🔄 Trying alternative seeding method...')
  
  try {
    // Clear existing data
    console.log('🧹 Clearing existing data...')
    await supabase.from('audit_photos').delete().neq('id', '')
    await supabase.from('audit_comments').delete().neq('id', '')
    await supabase.from('audits').delete().neq('id', '')
    await supabase.from('auditor_assignments').delete().neq('id', '')
    await supabase.from('users').delete().neq('id', '')
    await supabase.from('branches').delete().neq('id', '')
    await supabase.from('zones').delete().neq('id', '')
    await supabase.from('surveys').delete().neq('id', '')
    await supabase.from('organizations').delete().neq('id', '')
    
    // Insert Organizations
    console.log('🏢 Inserting organizations...')
    const { error: orgError } = await supabase.from('organizations').insert([
      { id: 'org_001', name: 'Global Retail Chain' },
      { id: 'org_002', name: 'Manufacturing Corp' }
    ])
    if (orgError) throw orgError
    
    // Insert Zones
    console.log('🗺️ Inserting zones...')
    const { error: zoneError } = await supabase.from('zones').insert([
      { id: 'zone_001', org_id: 'org_001', name: 'North Region', description: 'Northern region covering states NY, NJ, CT' },
      { id: 'zone_002', org_id: 'org_001', name: 'South Region', description: 'Southern region covering states FL, GA, SC' },
      { id: 'zone_003', org_id: 'org_001', name: 'West Region', description: 'Western region covering states CA, NV, AZ' },
      { id: 'zone_004', org_id: 'org_001', name: 'Central Region', description: 'Central region covering states TX, OK, KS' },
      { id: 'zone_005', org_id: 'org_002', name: 'East Manufacturing', description: 'Eastern manufacturing facilities' },
      { id: 'zone_006', org_id: 'org_002', name: 'West Manufacturing', description: 'Western manufacturing facilities' }
    ])
    if (zoneError) throw zoneError
    
    // Insert sample branches
    console.log('🏪 Inserting branches...')
    const { error: branchError } = await supabase.from('branches').insert([
      { 
        id: 'branch_001', 
        org_id: 'org_001', 
        zone_id: 'zone_001', 
        name: 'Manhattan Store', 
        address: '123 Broadway Ave', 
        city: 'New York', 
        state: 'NY', 
        zip_code: '10001',
        phone: '(212) 555-0101',
        email: 'manhattan@retailchain.com'
      },
      { 
        id: 'branch_002', 
        org_id: 'org_001', 
        zone_id: 'zone_001', 
        name: 'Brooklyn Store', 
        address: '456 Atlantic Ave', 
        city: 'Brooklyn', 
        state: 'NY', 
        zip_code: '11201',
        phone: '(718) 555-0102',
        email: 'brooklyn@retailchain.com'
      },
      { 
        id: 'branch_003', 
        org_id: 'org_001', 
        zone_id: 'zone_002', 
        name: 'Miami Store', 
        address: '321 Ocean Drive', 
        city: 'Miami', 
        state: 'FL', 
        zip_code: '33139',
        phone: '(305) 555-0104',
        email: 'miami@retailchain.com'
      }
    ])
    if (branchError) throw branchError
    
    console.log('✅ Alternative seeding completed!')
    console.log('Note: This is a simplified dataset. Run the full SQL script for complete data.')
    
  } catch (err) {
    console.error('❌ Alternative seeding failed:', err)
  }
}

// Run the seeding
seedDatabase().catch(() => {
  console.log('⚠️ Primary method failed, trying alternative...')
  seedDatabaseAlternative()
})
