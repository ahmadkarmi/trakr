#!/usr/bin/env node

const readline = require('readline')
const { createClient } = require('@supabase/supabase-js')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer)
    })
  })
}

async function main() {
  console.log('🌱 Trakr Database Seeding Script')
  console.log('================================')
  console.log('')
  console.log('I need your Supabase credentials to seed the database.')
  console.log('You can find these in your Supabase project settings > API')
  console.log('')

  const supabaseUrl = await askQuestion('Enter your Supabase URL (https://xxx.supabase.co): ')
  const supabaseKey = await askQuestion('Enter your Supabase service role key (or anon key): ')
  
  rl.close()

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing credentials. Exiting.')
    process.exit(1)
  }

  console.log('\n🚀 Starting database seeding...')
  
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Test connection
    console.log('🔌 Testing connection...')
    const { data, error } = await supabase.from('organizations').select('count').limit(1)
    if (error && !error.message.includes('does not exist')) {
      throw error
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
        console.log(`  ⚠️  Warning clearing ${table}: ${err.message}`)
      }
    }

    // Seed organizations
    console.log('🏢 Seeding organizations...')
    await supabase.from('organizations').insert([
      { id: 'org_001', name: 'Global Retail Chain' },
      { id: 'org_002', name: 'Manufacturing Corp' }
    ])

    // Seed zones
    console.log('🗺️ Seeding zones...')
    await supabase.from('zones').insert([
      { id: 'zone_001', org_id: 'org_001', name: 'North Region', description: 'Northern region covering NY, NJ, CT' },
      { id: 'zone_002', org_id: 'org_001', name: 'South Region', description: 'Southern region covering FL, GA, SC' },
      { id: 'zone_003', org_id: 'org_001', name: 'West Region', description: 'Western region covering CA, NV, AZ' },
      { id: 'zone_004', org_id: 'org_001', name: 'Central Region', description: 'Central region covering TX, OK, KS' }
    ])

    // Seed branches
    console.log('🏪 Seeding branches...')
    await supabase.from('branches').insert([
      { id: 'branch_001', org_id: 'org_001', zone_id: 'zone_001', name: 'Manhattan Store', address: '123 Broadway Ave', city: 'New York', state: 'NY', zip_code: '10001', phone: '(212) 555-0101', email: 'manhattan@retailchain.com' },
      { id: 'branch_002', org_id: 'org_001', zone_id: 'zone_001', name: 'Brooklyn Store', address: '456 Atlantic Ave', city: 'Brooklyn', state: 'NY', zip_code: '11201', phone: '(718) 555-0102', email: 'brooklyn@retailchain.com' },
      { id: 'branch_003', org_id: 'org_001', zone_id: 'zone_002', name: 'Miami Store', address: '321 Ocean Drive', city: 'Miami', state: 'FL', zip_code: '33139', phone: '(305) 555-0104', email: 'miami@retailchain.com' },
      { id: 'branch_004', org_id: 'org_001', zone_id: 'zone_002', name: 'Atlanta Store', address: '654 Peachtree St', city: 'Atlanta', state: 'GA', zip_code: '30309', phone: '(404) 555-0105', email: 'atlanta@retailchain.com' },
      { id: 'branch_005', org_id: 'org_001', zone_id: 'zone_003', name: 'Los Angeles Store', address: '147 Sunset Blvd', city: 'Los Angeles', state: 'CA', zip_code: '90028', phone: '(323) 555-0107', email: 'la@retailchain.com' },
      { id: 'branch_006', org_id: 'org_001', zone_id: 'zone_003', name: 'San Francisco Store', address: '258 Market St', city: 'San Francisco', state: 'CA', zip_code: '94102', phone: '(415) 555-0108', email: 'sf@retailchain.com' },
      { id: 'branch_007', org_id: 'org_001', zone_id: 'zone_004', name: 'Dallas Store', address: '741 Main St', city: 'Dallas', state: 'TX', zip_code: '75201', phone: '(214) 555-0110', email: 'dallas@retailchain.com' },
      { id: 'branch_008', org_id: 'org_001', zone_id: 'zone_004', name: 'Houston Store', address: '852 Commerce St', city: 'Houston', state: 'TX', zip_code: '77002', phone: '(713) 555-0111', email: 'houston@retailchain.com' }
    ])

    // Seed users
    console.log('👥 Seeding users...')
    await supabase.from('users').insert([
      { id: 'user_001', org_id: 'org_001', email: 'admin@retailchain.com', name: 'Admin User', role: 'ADMIN', is_active: true },
      { id: 'user_002', org_id: 'org_001', email: 'manager.manhattan@retailchain.com', name: 'Jennifer Lee', role: 'BRANCH_MANAGER', is_active: true },
      { id: 'user_003', org_id: 'org_001', email: 'manager.miami@retailchain.com', name: 'Maria Garcia', role: 'BRANCH_MANAGER', is_active: true },
      { id: 'user_004', org_id: 'org_001', email: 'manager.la@retailchain.com', name: 'James Anderson', role: 'BRANCH_MANAGER', is_active: true },
      { id: 'user_005', org_id: 'org_001', email: 'auditor1@retailchain.com', name: 'Amanda White', role: 'AUDITOR', is_active: true },
      { id: 'user_006', org_id: 'org_001', email: 'auditor2@retailchain.com', name: 'Christopher Davis', role: 'AUDITOR', is_active: true },
      { id: 'user_007', org_id: 'org_001', email: 'auditor3@retailchain.com', name: 'Jessica Miller', role: 'AUDITOR', is_active: true }
    ])

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
    console.log('  • 2 Organizations')
    console.log('  • 4 Zones')
    console.log('  • 8 Branches')
    console.log('  • 7 Users (1 admin, 3 branch managers, 3 auditors)')
    
    console.log('\n🔐 Test User Accounts:')
    console.log('  Admin: admin@retailchain.com')
    console.log('  Branch Manager (2 branches): manager.manhattan@retailchain.com')
    console.log('  Branch Manager (2 branches): manager.miami@retailchain.com')
    console.log('  Branch Manager (4 branches): manager.la@retailchain.com')
    console.log('  Auditor: auditor1@retailchain.com')
    
    console.log('\n🎯 Ready for Testing!')
    console.log('  • Multiple branch manager scenarios ready')
    console.log('  • Analytics will show real organizational data')
    console.log('  • Role-based access control configured')

  } catch (error) {
    console.error('❌ Seeding failed:', error.message)
    if (error.details) {
      console.error('Details:', error.details)
    }
    process.exit(1)
  }
}

main()
