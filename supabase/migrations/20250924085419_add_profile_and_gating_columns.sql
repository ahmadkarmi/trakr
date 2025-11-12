-- Add profile-related columns to users
alter table public.users add column if not exists full_name text;
alter table public.users add column if not exists avatar_url text;
alter table public.users add column if not exists signature_url text;

-- Add gating policy to organizations
alter table public.organizations add column if not exists gating_policy text default 'completed_approved';
;
