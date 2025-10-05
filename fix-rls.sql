-- Fix RLS Policies for Users Table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all users
DROP POLICY IF EXISTS "Allow authenticated users to read users" ON users;
CREATE POLICY "Allow authenticated users to read users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to update their own record
DROP POLICY IF EXISTS "Allow users to update own record" ON users;
CREATE POLICY "Allow users to update own record"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow service role full access (for scripts)
DROP POLICY IF EXISTS "Allow service role full access" ON users;
CREATE POLICY "Allow service role full access"
  ON users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
