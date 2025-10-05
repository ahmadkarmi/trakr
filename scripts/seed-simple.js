#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

// Update these with your actual Supabase credentials
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'YOUR_SERVICE_KEY_HERE'

console.log('🌱 Starting database seeding...')

if (SUPABASE_URL.includes('YOUR_SUPABASE_URL_HERE')) {
  console.log('❌ Please set SUPABASE_URL environment variable or update the script')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function seedDatabase() {
  try {
    // Clear existing data
    console.log('🧹 Clearing existing data...')
    await supabase.from('audits').delete().neq('id', '')
    await supabase.from('users').delete().neq('id', '')
    await supabase.from('branches').delete().neq('id', '')
    await supabase.from('zones').delete().neq('id', '')
    await supabase.from('organizations').delete().neq('id', '')
    
    // Seed organizations
    console.log('🏢 Seeding organizations...')
    await supabase.from('organizations').insert([
      { id: 'org_001', name: 'Global Retail Chain' }
    ])
    
    // Seed zones
    console.log('🗺️ Seeding zones...')
    await supabase.from('zones').insert([
      { id: 'zone_001', org_id: 'org_001', name: 'North Region', description: 'Northern region' },
      { id: 'zone_002', org_id: 'org_001', name: 'South Region', description: 'Southern region' }
    ])
    
    // Seed branches
    console.log('🏪 Seeding branches...')
    await supabase.from('branches').insert([
      { id: 'branch_001', org_id: 'org_001', zone_id: 'zone_001', name: 'Manhattan Store', address: '123 Broadway Ave', city: 'New York', state: 'NY', zip_code: '10001', phone: '(212) 555-0101', email: 'manhattan@retailchain.com' },
      { id: 'branch_002', org_id: 'org_001', zone_id: 'zone_001', name: 'Brooklyn Store', address: '456 Atlantic Ave', city: 'Brooklyn', state: 'NY', zip_code: '11201', phone: '(718) 555-0102', email: 'brooklyn@retailchain.com' },
      { id: 'branch_003', org_id: 'org_001', zone_id: 'zone_002', name: 'Miami Store', address: '321 Ocean Drive', city: 'Miami', state: 'FL', zip_code: '33139', phone: '(305) 555-0104', email: 'miami@retailchain.com' }
    ])
    
    // Seed users
    console.log('👥 Seeding users...')
    await supabase.from('users').insert([
      { id: 'user_001', org_id: 'org_001', email: 'admin@retailchain.com', name: 'Admin User', role: 'ADMIN', is_active: true },
      { id: 'user_002', org_id: 'org_001', email: 'manager.manhattan@retailchain.com', name: 'Jennifer Lee', role: 'BRANCH_MANAGER', is_active: true },
      { id: 'user_003', org_id: 'org_001', email: 'manager.miami@retailchain.com', name: 'Maria Garcia', role: 'BRANCH_MANAGER', is_active: true },
      { id: 'user_004', org_id: 'org_001', email: 'auditor1@retailchain.com', name: 'Amanda White', role: 'AUDITOR', is_active: true },
      { id: 'user_005', org_id: 'org_001', email: 'auditor2@retailchain.com', name: 'Christopher Davis', role: 'AUDITOR', is_active: true }
    ])
    
    // Update branch managers
    console.log('🔄 Assigning branch managers...')
    await supabase.from('branches').update({ manager_id: 'user_002' }).eq('id', 'branch_001')
    await supabase.from('branches').update({ manager_id: 'user_002' }).eq('id', 'branch_002')
    await supabase.from('branches').update({ manager_id: 'user_003' }).eq('id', 'branch_003')
    
    console.log('✅ Database seeding completed!')
    console.log('🎯 Test with: admin@retailchain.com, manager.manhattan@retailchain.com, auditor1@retailchain.com')
    
  } catch (error) {
    console.error('❌ Seeding failed:', error)
  }
}

seedDatabase()
