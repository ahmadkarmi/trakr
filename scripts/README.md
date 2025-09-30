# Database Seeding Scripts

This directory contains scripts to populate your Supabase database with realistic test data for comprehensive system testing.

## 🎯 What Gets Seeded

### Organizations & Structure
- **2 Organizations**: Global Retail Chain + Manufacturing Corp
- **6 Zones**: 4 retail regions + 2 manufacturing regions  
- **15 Branches**: 12 retail stores + 3 manufacturing facilities

### Users & Roles
- **1 Super Admin**: Full system access
- **3 Admins**: Organization-level management
- **6 Branch Managers**: Managing 1-3 branches each (testing multiple branch manager scenario)
- **10 Auditors**: Assigned to specific branches and zones

### Audit Data
- **3 Survey Templates**: Safety audits, customer experience, manufacturing safety
- **15 Audits**: Various statuses (completed, in-progress, submitted, overdue)
- **5 Audit Comments**: Realistic feedback and notes
- **4 Audit Photos**: Mock evidence photos using Unsplash

## 🚀 How to Seed

### Method 1: Direct SQL (Recommended)

1. **Get your Supabase credentials**:
   - Go to your Supabase project dashboard
   - Navigate to Settings > API
   - Copy your Project URL and service_role key

2. **Run the SQL script directly in Supabase**:
   - Go to SQL Editor in your Supabase dashboard
   - Copy the contents of `seed-database.sql`
   - Paste and execute

### Method 2: Node.js Script

1. **Set environment variables**:
   ```bash
   export SUPABASE_URL="your_supabase_project_url"
   export SUPABASE_SERVICE_KEY="your_service_role_key"
   ```

2. **Install dependencies** (if not already installed):
   ```bash
   npm install @supabase/supabase-js
   ```

3. **Run the seeding script**:
   ```bash
   node scripts/seed-database.js
   ```

## 🔐 Test User Accounts

After seeding, you can test with these user accounts:

| Role | Email | Description |
|------|-------|-------------|
| Super Admin | `superadmin@retailchain.com` | Full system access |
| Admin | `admin1@retailchain.com` | System administration |
| Branch Manager | `manager.manhattan@retailchain.com` | Manages Manhattan store |
| Branch Manager | `manager.la@retailchain.com` | Manages 3 West Coast stores |
| Auditor | `auditor1@retailchain.com` | Covers Manhattan & Brooklyn |
| Auditor | `auditor3@retailchain.com` | Covers Miami & Atlanta |

**Note**: You'll need to set up authentication passwords through your Supabase Auth settings.

## 📊 Testing Scenarios

The seeded data enables testing of:

### Multiple Branch Manager Scenarios
- **Single branch managers**: Jennifer (Manhattan only)
- **Multi-branch managers**: James (LA, SF, Vegas), Lisa (Dallas, Houston, OKC)
- **Cross-zone management**: Some managers handle branches across regions

### Analytics Dashboard Testing
- **Real completion rates**: Based on actual audit statuses
- **Performance comparisons**: Branch vs branch, auditor vs auditor
- **Trend analysis**: Mix of recent and older audits
- **Overdue tracking**: Some audits are past due date

### Audit Workflow Testing
- **Various statuses**: Draft, In Progress, Submitted, Completed, Approved
- **Comments and photos**: Realistic audit evidence
- **Assignment logic**: Auditors assigned to specific branches/zones
- **Approval workflow**: Submitted audits waiting for manager approval

### Role-Based Access Testing
- **Admin analytics**: System-wide visibility
- **Branch manager analytics**: Scoped to their branches only
- **Auditor analytics**: Personal performance only
- **Data security**: Each role sees appropriate data only

## 🧹 Clearing Data

To clear all seeded data and start fresh:

```sql
-- Run this in Supabase SQL Editor
DELETE FROM audit_photos;
DELETE FROM audit_comments;
DELETE FROM audits;
DELETE FROM auditor_assignments;
DELETE FROM users;
DELETE FROM branches;
DELETE FROM zones;
DELETE FROM surveys;
DELETE FROM organizations;
```

## 🔧 Customization

You can modify the seed data by editing `seed-database.sql`:

- **Add more branches**: Insert additional branch records
- **Create more users**: Add auditors, managers, or admins
- **Adjust audit data**: Change statuses, add more responses
- **Modify survey templates**: Update questions and sections
- **Change assignments**: Reassign auditors to different branches

## 🎯 Ready for Testing!

Once seeded, your Trakr system will have:
- ✅ **Functional analytics** with real data
- ✅ **Multiple branch manager scenarios** 
- ✅ **Realistic audit workflows**
- ✅ **Role-based access control**
- ✅ **Comprehensive test coverage**

Happy testing! 🚀
