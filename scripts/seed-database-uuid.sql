-- Trakr Database Seeding Script (UUID Compatible)
-- This script works with UUID primary keys and populates realistic test data

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

-- Insert Organizations (let database generate UUIDs)
INSERT INTO organizations (name, created_at, updated_at) VALUES
('Global Retail Chain', NOW(), NOW()),
('Manufacturing Corp', NOW(), NOW());

-- Get the organization IDs for reference
WITH org_ids AS (
  SELECT id, name FROM organizations WHERE name IN ('Global Retail Chain', 'Manufacturing Corp')
)
-- Insert Zones
INSERT INTO zones (org_id, name, description, created_at, updated_at)
SELECT 
  o.id,
  z.name,
  z.description,
  NOW(),
  NOW()
FROM org_ids o
CROSS JOIN (
  VALUES 
    ('North Region', 'Northern region covering states NY, NJ, CT'),
    ('South Region', 'Southern region covering states FL, GA, SC'),
    ('West Region', 'Western region covering states CA, NV, AZ'),
    ('Central Region', 'Central region covering states TX, OK, KS')
) z(name, description)
WHERE o.name = 'Global Retail Chain'

UNION ALL

SELECT 
  o.id,
  z.name,
  z.description,
  NOW(),
  NOW()
FROM org_ids o
CROSS JOIN (
  VALUES 
    ('East Manufacturing', 'Eastern manufacturing facilities'),
    ('West Manufacturing', 'Western manufacturing facilities')
) z(name, description)
WHERE o.name = 'Manufacturing Corp';

-- Insert Branches
WITH org_zone_data AS (
  SELECT 
    o.id as org_id,
    o.name as org_name,
    z.id as zone_id,
    z.name as zone_name
  FROM organizations o
  JOIN zones z ON o.id = z.org_id
)
INSERT INTO branches (org_id, zone_id, name, address, city, state, zip_code, phone, email, created_at, updated_at)
SELECT 
  ozd.org_id,
  ozd.zone_id,
  b.name,
  b.address,
  b.city,
  b.state,
  b.zip_code,
  b.phone,
  b.email,
  NOW(),
  NOW()
FROM org_zone_data ozd
CROSS JOIN (
  VALUES 
    ('Manhattan Store', '123 Broadway Ave', 'New York', 'NY', '10001', '(212) 555-0101', 'manhattan@retailchain.com'),
    ('Brooklyn Store', '456 Atlantic Ave', 'Brooklyn', 'NY', '11201', '(718) 555-0102', 'brooklyn@retailchain.com'),
    ('Newark Store', '789 Market St', 'Newark', 'NJ', '07102', '(973) 555-0103', 'newark@retailchain.com')
) b(name, address, city, state, zip_code, phone, email)
WHERE ozd.zone_name = 'North Region'

UNION ALL

SELECT 
  ozd.org_id,
  ozd.zone_id,
  b.name,
  b.address,
  b.city,
  b.state,
  b.zip_code,
  b.phone,
  b.email,
  NOW(),
  NOW()
FROM org_zone_data ozd
CROSS JOIN (
  VALUES 
    ('Miami Store', '321 Ocean Drive', 'Miami', 'FL', '33139', '(305) 555-0104', 'miami@retailchain.com'),
    ('Atlanta Store', '654 Peachtree St', 'Atlanta', 'GA', '30309', '(404) 555-0105', 'atlanta@retailchain.com'),
    ('Charleston Store', '987 King St', 'Charleston', 'SC', '29401', '(843) 555-0106', 'charleston@retailchain.com')
) b(name, address, city, state, zip_code, phone, email)
WHERE ozd.zone_name = 'South Region'

UNION ALL

SELECT 
  ozd.org_id,
  ozd.zone_id,
  b.name,
  b.address,
  b.city,
  b.state,
  b.zip_code,
  b.phone,
  b.email,
  NOW(),
  NOW()
FROM org_zone_data ozd
CROSS JOIN (
  VALUES 
    ('Los Angeles Store', '147 Sunset Blvd', 'Los Angeles', 'CA', '90028', '(323) 555-0107', 'la@retailchain.com'),
    ('San Francisco Store', '258 Market St', 'San Francisco', 'CA', '94102', '(415) 555-0108', 'sf@retailchain.com'),
    ('Las Vegas Store', '369 Las Vegas Blvd', 'Las Vegas', 'NV', '89101', '(702) 555-0109', 'vegas@retailchain.com')
) b(name, address, city, state, zip_code, phone, email)
WHERE ozd.zone_name = 'West Region'

UNION ALL

SELECT 
  ozd.org_id,
  ozd.zone_id,
  b.name,
  b.address,
  b.city,
  b.state,
  b.zip_code,
  b.phone,
  b.email,
  NOW(),
  NOW()
FROM org_zone_data ozd
CROSS JOIN (
  VALUES 
    ('Dallas Store', '741 Main St', 'Dallas', 'TX', '75201', '(214) 555-0110', 'dallas@retailchain.com'),
    ('Houston Store', '852 Commerce St', 'Houston', 'TX', '77002', '(713) 555-0111', 'houston@retailchain.com'),
    ('Oklahoma City Store', '963 Broadway', 'Oklahoma City', 'OK', '73102', '(405) 555-0112', 'okc@retailchain.com')
) b(name, address, city, state, zip_code, phone, email)
WHERE ozd.zone_name = 'Central Region';

-- Insert Users
WITH org_data AS (
  SELECT id, name FROM organizations WHERE name = 'Global Retail Chain'
)
INSERT INTO users (org_id, email, name, role, avatar_url, phone, is_active, created_at, updated_at)
SELECT 
  o.id,
  u.email,
  u.name,
  u.role,
  u.avatar_url,
  u.phone,
  true,
  NOW(),
  NOW()
FROM org_data o
CROSS JOIN (
  VALUES 
    ('admin@retailchain.com', 'Admin User', 'ADMIN', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', '(555) 000-0001'),
    ('manager.manhattan@retailchain.com', 'Jennifer Lee', 'BRANCH_MANAGER', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150', '(555) 000-0002'),
    ('manager.miami@retailchain.com', 'Maria Garcia', 'BRANCH_MANAGER', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', '(555) 000-0003'),
    ('manager.la@retailchain.com', 'James Anderson', 'BRANCH_MANAGER', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', '(555) 000-0004'),
    ('auditor1@retailchain.com', 'Amanda White', 'AUDITOR', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', '(555) 000-0005'),
    ('auditor2@retailchain.com', 'Christopher Davis', 'AUDITOR', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', '(555) 000-0006'),
    ('auditor3@retailchain.com', 'Jessica Miller', 'AUDITOR', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', '(555) 000-0007')
) u(email, name, role, avatar_url, phone);

-- Update branch managers (assign managers to branches)
WITH branch_manager_assignments AS (
  SELECT 
    b.id as branch_id,
    u.id as manager_id,
    b.name as branch_name,
    u.name as manager_name
  FROM branches b
  CROSS JOIN users u
  WHERE u.role = 'BRANCH_MANAGER'
  AND (
    (b.name LIKE '%Manhattan%' AND u.email = 'manager.manhattan@retailchain.com') OR
    (b.name LIKE '%Brooklyn%' AND u.email = 'manager.manhattan@retailchain.com') OR
    (b.name LIKE '%Miami%' AND u.email = 'manager.miami@retailchain.com') OR
    (b.name LIKE '%Atlanta%' AND u.email = 'manager.miami@retailchain.com') OR
    (b.name LIKE '%Los Angeles%' AND u.email = 'manager.la@retailchain.com') OR
    (b.name LIKE '%San Francisco%' AND u.email = 'manager.la@retailchain.com') OR
    (b.name LIKE '%Las Vegas%' AND u.email = 'manager.la@retailchain.com') OR
    (b.name LIKE '%Dallas%' AND u.email = 'manager.la@retailchain.com') OR
    (b.name LIKE '%Houston%' AND u.email = 'manager.la@retailchain.com') OR
    (b.name LIKE '%Oklahoma%' AND u.email = 'manager.la@retailchain.com')
  )
)
UPDATE branches 
SET manager_id = bma.manager_id
FROM branch_manager_assignments bma
WHERE branches.id = bma.branch_id;

-- Insert Survey Templates
WITH org_admin AS (
  SELECT o.id as org_id, u.id as admin_id
  FROM organizations o
  CROSS JOIN users u
  WHERE o.name = 'Global Retail Chain' AND u.role = 'ADMIN'
  LIMIT 1
)
INSERT INTO surveys (org_id, title, description, frequency, sections, version, is_active, created_by, created_at, updated_at)
SELECT 
  oa.org_id,
  'Retail Safety Audit',
  'Comprehensive safety audit for retail locations',
  'MONTHLY',
  '[
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
  ]'::jsonb,
  1,
  true,
  oa.admin_id,
  NOW(),
  NOW()
FROM org_admin oa;

-- Success message
SELECT 'Database seeding completed successfully!' as status,
       'Organizations: ' || (SELECT COUNT(*) FROM organizations) as organizations,
       'Zones: ' || (SELECT COUNT(*) FROM zones) as zones,
       'Branches: ' || (SELECT COUNT(*) FROM branches) as branches,
       'Users: ' || (SELECT COUNT(*) FROM users) as users,
       'Surveys: ' || (SELECT COUNT(*) FROM surveys) as surveys;
