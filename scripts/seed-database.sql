-- Trakr Database Seeding Script
-- This script populates the database with realistic test data for comprehensive system testing

-- Clear existing data (in correct order to handle foreign key constraints)
DELETE FROM audit_photos;
DELETE FROM audit_comments;
DELETE FROM audits;
DELETE FROM auditor_assignments;
DELETE FROM users;
DELETE FROM branches;
DELETE FROM zones;
DELETE FROM surveys;
DELETE FROM organizations;

-- Insert Organizations
INSERT INTO organizations (id, name, created_at, updated_at) VALUES
('org_001', 'Global Retail Chain', NOW(), NOW()),
('org_002', 'Manufacturing Corp', NOW(), NOW());

-- Insert Zones
INSERT INTO zones (id, org_id, name, description, created_at, updated_at) VALUES
('zone_001', 'org_001', 'North Region', 'Northern region covering states NY, NJ, CT', NOW(), NOW()),
('zone_002', 'org_001', 'South Region', 'Southern region covering states FL, GA, SC', NOW(), NOW()),
('zone_003', 'org_001', 'West Region', 'Western region covering states CA, NV, AZ', NOW(), NOW()),
('zone_004', 'org_001', 'Central Region', 'Central region covering states TX, OK, KS', NOW(), NOW()),
('zone_005', 'org_002', 'East Manufacturing', 'Eastern manufacturing facilities', NOW(), NOW()),
('zone_006', 'org_002', 'West Manufacturing', 'Western manufacturing facilities', NOW(), NOW());

-- Insert Branches
INSERT INTO branches (id, org_id, zone_id, name, address, city, state, zip_code, phone, email, manager_id, created_at, updated_at) VALUES
-- North Region Branches
('branch_001', 'org_001', 'zone_001', 'Manhattan Store', '123 Broadway Ave', 'New York', 'NY', '10001', '(212) 555-0101', 'manhattan@retailchain.com', NULL, NOW(), NOW()),
('branch_002', 'org_001', 'zone_001', 'Brooklyn Store', '456 Atlantic Ave', 'Brooklyn', 'NY', '11201', '(718) 555-0102', 'brooklyn@retailchain.com', NULL, NOW(), NOW()),
('branch_003', 'org_001', 'zone_001', 'Newark Store', '789 Market St', 'Newark', 'NJ', '07102', '(973) 555-0103', 'newark@retailchain.com', NULL, NOW(), NOW()),

-- South Region Branches  
('branch_004', 'org_001', 'zone_002', 'Miami Store', '321 Ocean Drive', 'Miami', 'FL', '33139', '(305) 555-0104', 'miami@retailchain.com', NULL, NOW(), NOW()),
('branch_005', 'org_001', 'zone_002', 'Atlanta Store', '654 Peachtree St', 'Atlanta', 'GA', '30309', '(404) 555-0105', 'atlanta@retailchain.com', NULL, NOW(), NOW()),
('branch_006', 'org_001', 'zone_002', 'Charleston Store', '987 King St', 'Charleston', 'SC', '29401', '(843) 555-0106', 'charleston@retailchain.com', NULL, NOW(), NOW()),

-- West Region Branches
('branch_007', 'org_001', 'zone_003', 'Los Angeles Store', '147 Sunset Blvd', 'Los Angeles', 'CA', '90028', '(323) 555-0107', 'la@retailchain.com', NULL, NOW(), NOW()),
('branch_008', 'org_001', 'zone_003', 'San Francisco Store', '258 Market St', 'San Francisco', 'CA', '94102', '(415) 555-0108', 'sf@retailchain.com', NULL, NOW(), NOW()),
('branch_009', 'org_001', 'zone_003', 'Las Vegas Store', '369 Las Vegas Blvd', 'Las Vegas', 'NV', '89101', '(702) 555-0109', 'vegas@retailchain.com', NULL, NOW(), NOW()),

-- Central Region Branches
('branch_010', 'org_001', 'zone_004', 'Dallas Store', '741 Main St', 'Dallas', 'TX', '75201', '(214) 555-0110', 'dallas@retailchain.com', NULL, NOW(), NOW()),
('branch_011', 'org_001', 'zone_004', 'Houston Store', '852 Commerce St', 'Houston', 'TX', '77002', '(713) 555-0111', 'houston@retailchain.com', NULL, NOW(), NOW()),
('branch_012', 'org_001', 'zone_004', 'Oklahoma City Store', '963 Broadway', 'Oklahoma City', 'OK', '73102', '(405) 555-0112', 'okc@retailchain.com', NULL, NOW(), NOW()),

-- Manufacturing Branches
('branch_013', 'org_002', 'zone_005', 'Boston Manufacturing', '159 Industrial Way', 'Boston', 'MA', '02101', '(617) 555-0113', 'boston@manufacturing.com', NULL, NOW(), NOW()),
('branch_014', 'org_002', 'zone_005', 'Philadelphia Manufacturing', '357 Factory Rd', 'Philadelphia', 'PA', '19101', '(215) 555-0114', 'philly@manufacturing.com', NULL, NOW(), NOW()),
('branch_015', 'org_002', 'zone_006', 'Seattle Manufacturing', '468 Harbor Dr', 'Seattle', 'WA', '98101', '(206) 555-0115', 'seattle@manufacturing.com', NULL, NOW(), NOW());

-- Insert Users (Super Admin, Admins, Branch Managers, Auditors)
INSERT INTO users (id, org_id, email, name, role, avatar_url, phone, is_active, created_at, updated_at) VALUES
-- Super Admin
('user_001', 'org_001', 'superadmin@retailchain.com', 'Sarah Johnson', 'SUPER_ADMIN', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150', '(555) 000-0001', true, NOW(), NOW()),

-- System Admins
('user_002', 'org_001', 'admin1@retailchain.com', 'Michael Chen', 'ADMIN', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', '(555) 000-0002', true, NOW(), NOW()),
('user_003', 'org_001', 'admin2@retailchain.com', 'Emily Rodriguez', 'ADMIN', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', '(555) 000-0003', true, NOW(), NOW()),
('user_004', 'org_002', 'admin@manufacturing.com', 'David Wilson', 'ADMIN', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', '(555) 000-0004', true, NOW(), NOW()),

-- Branch Managers
('user_005', 'org_001', 'manager.manhattan@retailchain.com', 'Jennifer Lee', 'BRANCH_MANAGER', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150', '(555) 000-0005', true, NOW(), NOW()),
('user_006', 'org_001', 'manager.brooklyn@retailchain.com', 'Robert Taylor', 'BRANCH_MANAGER', 'https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?w=150', '(555) 000-0006', true, NOW(), NOW()),
('user_007', 'org_001', 'manager.miami@retailchain.com', 'Maria Garcia', 'BRANCH_MANAGER', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', '(555) 000-0007', true, NOW(), NOW()),
('user_008', 'org_001', 'manager.la@retailchain.com', 'James Anderson', 'BRANCH_MANAGER', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', '(555) 000-0008', true, NOW(), NOW()),
('user_009', 'org_001', 'manager.dallas@retailchain.com', 'Lisa Thompson', 'BRANCH_MANAGER', 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150', '(555) 000-0009', true, NOW(), NOW()),
('user_010', 'org_002', 'manager.boston@manufacturing.com', 'Kevin Brown', 'BRANCH_MANAGER', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', '(555) 000-0010', true, NOW(), NOW()),

-- Auditors
('user_011', 'org_001', 'auditor1@retailchain.com', 'Amanda White', 'AUDITOR', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', '(555) 000-0011', true, NOW(), NOW()),
('user_012', 'org_001', 'auditor2@retailchain.com', 'Christopher Davis', 'AUDITOR', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', '(555) 000-0012', true, NOW(), NOW()),
('user_013', 'org_001', 'auditor3@retailchain.com', 'Jessica Miller', 'AUDITOR', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', '(555) 000-0013', true, NOW(), NOW()),
('user_014', 'org_001', 'auditor4@retailchain.com', 'Daniel Wilson', 'AUDITOR', 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150', '(555) 000-0014', true, NOW(), NOW()),
('user_015', 'org_001', 'auditor5@retailchain.com', 'Rachel Moore', 'AUDITOR', 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=150', '(555) 000-0015', true, NOW(), NOW()),
('user_016', 'org_001', 'auditor6@retailchain.com', 'Thomas Jackson', 'AUDITOR', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', '(555) 000-0016', true, NOW(), NOW()),
('user_017', 'org_001', 'auditor7@retailchain.com', 'Nicole Martin', 'AUDITOR', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', '(555) 000-0017', true, NOW(), NOW()),
('user_018', 'org_001', 'auditor8@retailchain.com', 'Andrew Lee', 'AUDITOR', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', '(555) 000-0018', true, NOW(), NOW()),
('user_019', 'org_002', 'auditor1@manufacturing.com', 'Stephanie Clark', 'AUDITOR', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150', '(555) 000-0019', true, NOW(), NOW()),
('user_020', 'org_002', 'auditor2@manufacturing.com', 'Mark Rodriguez', 'AUDITOR', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', '(555) 000-0020', true, NOW(), NOW());

-- Update branches with manager assignments
UPDATE branches SET manager_id = 'user_005' WHERE id = 'branch_001'; -- Manhattan
UPDATE branches SET manager_id = 'user_006' WHERE id = 'branch_002'; -- Brooklyn  
UPDATE branches SET manager_id = 'user_006' WHERE id = 'branch_003'; -- Newark (Robert manages 2 branches)
UPDATE branches SET manager_id = 'user_007' WHERE id = 'branch_004'; -- Miami
UPDATE branches SET manager_id = 'user_007' WHERE id = 'branch_005'; -- Atlanta (Maria manages 2 branches)
UPDATE branches SET manager_id = 'user_007' WHERE id = 'branch_006'; -- Charleston (Maria manages 3 branches)
UPDATE branches SET manager_id = 'user_008' WHERE id = 'branch_007'; -- Los Angeles
UPDATE branches SET manager_id = 'user_008' WHERE id = 'branch_008'; -- San Francisco (James manages 2 branches)
UPDATE branches SET manager_id = 'user_008' WHERE id = 'branch_009'; -- Las Vegas (James manages 3 branches)
UPDATE branches SET manager_id = 'user_009' WHERE id = 'branch_010'; -- Dallas
UPDATE branches SET manager_id = 'user_009' WHERE id = 'branch_011'; -- Houston (Lisa manages 2 branches)
UPDATE branches SET manager_id = 'user_009' WHERE id = 'branch_012'; -- Oklahoma City (Lisa manages 3 branches)
UPDATE branches SET manager_id = 'user_010' WHERE id = 'branch_013'; -- Boston Manufacturing
UPDATE branches SET manager_id = 'user_010' WHERE id = 'branch_014'; -- Philadelphia (Kevin manages 2 branches)
UPDATE branches SET manager_id = 'user_010' WHERE id = 'branch_015'; -- Seattle (Kevin manages 3 branches)

-- Insert Survey Templates
INSERT INTO surveys (id, org_id, title, description, frequency, sections, version, is_active, created_by, created_at, updated_at) VALUES
('survey_001', 'org_001', 'Retail Safety Audit', 'Comprehensive safety audit for retail locations', 'MONTHLY', '[
  {
    "id": "section_001",
    "title": "Store Safety",
    "order": 1,
    "questions": [
      {
        "id": "q_001",
        "text": "Are all emergency exits clearly marked and unobstructed?",
        "type": "yes_no",
        "order": 1,
        "isRequired": true,
        "isWeighted": true,
        "yesWeight": 10,
        "noWeight": 0
      },
      {
        "id": "q_002", 
        "text": "Are fire extinguishers properly mounted and accessible?",
        "type": "yes_no",
        "order": 2,
        "isRequired": true,
        "isWeighted": true,
        "yesWeight": 8,
        "noWeight": 0
      },
      {
        "id": "q_003",
        "text": "Are all walkways free of hazards and properly lit?",
        "type": "yes_no", 
        "order": 3,
        "isRequired": true,
        "isWeighted": true,
        "yesWeight": 7,
        "noWeight": 0
      }
    ]
  },
  {
    "id": "section_002",
    "title": "Customer Service",
    "order": 2,
    "questions": [
      {
        "id": "q_004",
        "text": "Are staff members greeting customers within 30 seconds?",
        "type": "yes_no",
        "order": 1,
        "isRequired": true,
        "isWeighted": true,
        "yesWeight": 5,
        "noWeight": 0
      },
      {
        "id": "q_005",
        "text": "Is the store clean and well-organized?",
        "type": "yes_no",
        "order": 2,
        "isRequired": true,
        "isWeighted": true,
        "yesWeight": 6,
        "noWeight": 0
      }
    ]
  }
]'::jsonb, 1, true, 'user_002', NOW(), NOW()),

('survey_002', 'org_001', 'Customer Experience Audit', 'Monthly customer experience evaluation', 'MONTHLY', '[
  {
    "id": "section_003",
    "title": "Store Presentation", 
    "order": 1,
    "questions": [
      {
        "id": "q_006",
        "text": "Are product displays attractive and well-stocked?",
        "type": "yes_no",
        "order": 1,
        "isRequired": true,
        "isWeighted": true,
        "yesWeight": 8,
        "noWeight": 0
      },
      {
        "id": "q_007",
        "text": "Are price tags clearly visible and accurate?",
        "type": "yes_no",
        "order": 2,
        "isRequired": true,
        "isWeighted": true,
        "yesWeight": 7,
        "noWeight": 0
      }
    ]
  }
]'::jsonb, 1, true, 'user_002', NOW(), NOW()),

('survey_003', 'org_002', 'Manufacturing Safety Audit', 'Comprehensive safety audit for manufacturing facilities', 'WEEKLY', '[
  {
    "id": "section_004",
    "title": "Equipment Safety",
    "order": 1,
    "questions": [
      {
        "id": "q_008",
        "text": "Are all safety guards in place on machinery?",
        "type": "yes_no",
        "order": 1,
        "isRequired": true,
        "isWeighted": true,
        "yesWeight": 10,
        "noWeight": 0
      },
      {
        "id": "q_009",
        "text": "Are emergency stop buttons clearly marked and functional?",
        "type": "yes_no",
        "order": 2,
        "isRequired": true,
        "isWeighted": true,
        "yesWeight": 10,
        "noWeight": 0
      }
    ]
  }
]'::jsonb, 1, true, 'user_004', NOW(), NOW());

-- Insert Auditor Assignments
INSERT INTO auditor_assignments (user_id, branch_ids, zone_ids, created_at, updated_at) VALUES
-- North Region Auditors
('user_011', '["branch_001", "branch_002"]', '["zone_001"]', NOW(), NOW()), -- Amanda covers Manhattan & Brooklyn
('user_012', '["branch_003"]', '["zone_001"]', NOW(), NOW()), -- Christopher covers Newark

-- South Region Auditors  
('user_013', '["branch_004", "branch_005"]', '["zone_002"]', NOW(), NOW()), -- Jessica covers Miami & Atlanta
('user_014', '["branch_006"]', '["zone_002"]', NOW(), NOW()), -- Daniel covers Charleston

-- West Region Auditors
('user_015', '["branch_007", "branch_008"]', '["zone_003"]', NOW(), NOW()), -- Rachel covers LA & SF
('user_016', '["branch_009"]', '["zone_003"]', NOW(), NOW()), -- Thomas covers Las Vegas

-- Central Region Auditors
('user_017', '["branch_010", "branch_011"]', '["zone_004"]', NOW(), NOW()), -- Nicole covers Dallas & Houston  
('user_018', '["branch_012"]', '["zone_004"]', NOW(), NOW()), -- Andrew covers Oklahoma City

-- Manufacturing Auditors
('user_019', '["branch_013", "branch_014"]', '["zone_005"]', NOW(), NOW()), -- Stephanie covers Boston & Philadelphia
('user_020', '["branch_015"]', '["zone_006"]', NOW(), NOW()); -- Mark covers Seattle

-- Insert Audits with various statuses and realistic data
INSERT INTO audits (id, org_id, branch_id, survey_id, survey_version, assigned_to, status, responses, period_start, period_end, due_at, created_at, updated_at, submitted_at, submitted_by) VALUES

-- Completed Audits (Recent)
('audit_001', 'org_001', 'branch_001', 'survey_001', 1, 'user_011', 'COMPLETED', 
'{"q_001": "yes", "q_002": "yes", "q_003": "yes", "q_004": "yes", "q_005": "no"}'::jsonb,
'2024-01-01', '2024-01-31', '2024-01-31', NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', 'user_011'),

('audit_002', 'org_001', 'branch_002', 'survey_001', 1, 'user_011', 'APPROVED',
'{"q_001": "yes", "q_002": "yes", "q_003": "no", "q_004": "yes", "q_005": "yes"}'::jsonb,
'2024-01-01', '2024-01-31', '2024-01-31', NOW() - INTERVAL '4 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', 'user_011'),

('audit_003', 'org_001', 'branch_004', 'survey_002', 1, 'user_013', 'COMPLETED',
'{"q_006": "yes", "q_007": "yes"}'::jsonb,
'2024-01-01', '2024-01-31', '2024-01-31', NOW() - INTERVAL '6 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', 'user_013'),

-- In Progress Audits
('audit_004', 'org_001', 'branch_007', 'survey_001', 1, 'user_015', 'IN_PROGRESS',
'{"q_001": "yes", "q_002": "yes"}'::jsonb,
'2024-02-01', '2024-02-29', '2024-02-29', NOW() - INTERVAL '2 days', NOW(), NULL, NULL),

('audit_005', 'org_001', 'branch_010', 'survey_002', 1, 'user_017', 'IN_PROGRESS',
'{"q_006": "no"}'::jsonb,
'2024-02-01', '2024-02-29', '2024-02-29', NOW() - INTERVAL '1 day', NOW(), NULL, NULL),

-- Submitted (Waiting for Approval)
('audit_006', 'org_001', 'branch_003', 'survey_001', 1, 'user_012', 'SUBMITTED',
'{"q_001": "yes", "q_002": "yes", "q_003": "yes", "q_004": "no", "q_005": "yes"}'::jsonb,
'2024-02-01', '2024-02-29', '2024-02-29', NOW() - INTERVAL '1 day', NOW(), NOW(), 'user_012'),

('audit_007', 'org_001', 'branch_005', 'survey_002', 1, 'user_013', 'SUBMITTED',
'{"q_006": "yes", "q_007": "no"}'::jsonb,
'2024-02-01', '2024-02-29', '2024-02-29', NOW() - INTERVAL '12 hours', NOW(), NOW() - INTERVAL '12 hours', 'user_013'),

-- Overdue Audits
('audit_008', 'org_001', 'branch_006', 'survey_001', 1, 'user_014', 'DRAFT',
'{"q_001": "yes"}'::jsonb,
'2024-01-01', '2024-01-31', '2024-01-31', NOW() - INTERVAL '10 days', NOW(), NULL, NULL),

('audit_009', 'org_001', 'branch_009', 'survey_002', 1, 'user_016', 'DRAFT',
'{}'::jsonb,
'2024-01-01', '2024-01-31', '2024-01-31', NOW() - INTERVAL '8 days', NOW(), NULL, NULL),

-- Manufacturing Audits
('audit_010', 'org_002', 'branch_013', 'survey_003', 1, 'user_019', 'COMPLETED',
'{"q_008": "yes", "q_009": "yes"}'::jsonb,
'2024-02-05', '2024-02-11', '2024-02-11', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 'user_019'),

('audit_011', 'org_002', 'branch_015', 'survey_003', 1, 'user_020', 'IN_PROGRESS',
'{"q_008": "no"}'::jsonb,
'2024-02-12', '2024-02-18', '2024-02-18', NOW() - INTERVAL '1 day', NOW(), NULL, NULL),

-- More Recent Audits for Better Analytics
('audit_012', 'org_001', 'branch_001', 'survey_002', 1, 'user_011', 'COMPLETED',
'{"q_006": "yes", "q_007": "yes"}'::jsonb,
'2024-02-01', '2024-02-29', '2024-02-29', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 'user_011'),

('audit_013', 'org_001', 'branch_008', 'survey_001', 1, 'user_015', 'APPROVED',
'{"q_001": "yes", "q_002": "yes", "q_003": "yes", "q_004": "yes", "q_005": "yes"}'::jsonb,
'2024-02-01', '2024-02-29', '2024-02-29', NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 'user_015'),

('audit_014', 'org_001', 'branch_011', 'survey_001', 1, 'user_017', 'COMPLETED',
'{"q_001": "no", "q_002": "yes", "q_003": "yes", "q_004": "yes", "q_005": "no"}'::jsonb,
'2024-02-01', '2024-02-29', '2024-02-29', NOW() - INTERVAL '4 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', 'user_017'),

('audit_015', 'org_001', 'branch_012', 'survey_002', 1, 'user_018', 'SUBMITTED',
'{"q_006": "no", "q_007": "yes"}'::jsonb,
'2024-02-01', '2024-02-29', '2024-02-29', NOW() - INTERVAL '6 hours', NOW(), NOW() - INTERVAL '6 hours', 'user_018');

-- Insert Audit Comments
INSERT INTO audit_comments (id, audit_id, question_id, comment, created_by, created_at, updated_at) VALUES
('comment_001', 'audit_001', 'q_005', 'Store cleanliness needs improvement in the electronics section', 'user_011', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
('comment_002', 'audit_002', 'q_003', 'Walkway near checkout has loose floor tile - maintenance notified', 'user_011', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
('comment_003', 'audit_006', 'q_004', 'Staff was busy with inventory during audit - may affect greeting time', 'user_012', NOW(), NOW()),
('comment_004', 'audit_008', 'q_001', 'Emergency exit blocked by seasonal display - immediate attention needed', 'user_014', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
('comment_005', 'audit_011', 'q_008', 'Safety guard missing on conveyor belt #3 - production stopped until fixed', 'user_020', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day');

-- Insert some audit photos (mock URLs)
INSERT INTO audit_photos (id, audit_id, question_id, photo_url, caption, uploaded_by, uploaded_at) VALUES
('photo_001', 'audit_001', 'q_005', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800', 'Electronics section showing dust accumulation', 'user_011', NOW() - INTERVAL '3 days'),
('photo_002', 'audit_002', 'q_003', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800', 'Loose floor tile near checkout area', 'user_011', NOW() - INTERVAL '2 days'),
('photo_003', 'audit_008', 'q_001', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800', 'Emergency exit blocked by display', 'user_014', NOW() - INTERVAL '10 days'),
('photo_004', 'audit_011', 'q_008', 'https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=800', 'Missing safety guard on conveyor belt', 'user_020', NOW() - INTERVAL '1 day');

-- Summary of seeded data:
-- Organizations: 2 (Retail Chain + Manufacturing Corp)
-- Zones: 6 (4 retail regions + 2 manufacturing regions)  
-- Branches: 15 (12 retail stores + 3 manufacturing facilities)
-- Users: 20 (1 super admin, 3 admins, 6 branch managers, 10 auditors)
-- Survey Templates: 3 (2 retail + 1 manufacturing)
-- Auditor Assignments: 10 (covering all branches)
-- Audits: 15 (various statuses: completed, in-progress, submitted, overdue)
-- Comments: 5 (realistic audit feedback)
-- Photos: 4 (mock evidence photos)

SELECT 'Database seeding completed successfully!' as status;
