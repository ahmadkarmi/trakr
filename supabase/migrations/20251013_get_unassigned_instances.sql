-- RPC: get_unassigned_instances
-- Returns survey-branch combinations where no auditor is assigned.
-- Params:
--   p_org_id    uuid?   -> restrict to org (NULL = use RLS / all visible)
--   p_frequency text    -> 'all' | 'weekly' | 'monthly' | 'quarterly'
--   p_search    text?   -> ILIKE on survey title or branch name
--   p_limit     int     -> default 50
--   p_offset    int     -> default 0

create or replace function public.get_unassigned_instances(
  p_org_id uuid default null,
  p_frequency text default 'all',
  p_search text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  survey_id uuid,
  survey_title text,
  frequency text,
  branch_id uuid,
  branch_name text
)
language sql
security definer
set search_path = public as
$$
with active_surveys as (
  select s.id, s.title, s.frequency, coalesce(s.applicable_branch_ids, '{}') as applicable_branch_ids, s.org_id
  from public.surveys s
  where s.is_active = true
    and (p_org_id is null or s.org_id = p_org_id)
    and (
      coalesce(lower(p_frequency), 'all') = 'all' or lower(s.frequency::text) = lower(p_frequency)
    )
), candidate_branches as (
  select s.id as survey_id,
         s.title as survey_title,
         lower(s.frequency::text) as frequency,
         b.id as branch_id,
         b.name as branch_name
  from active_surveys s
  join public.branches b on b.org_id = s.org_id
  where (array_length(s.applicable_branch_ids, 1) is null
         or array_length(s.applicable_branch_ids, 1) = 0
         or b.id = any (s.applicable_branch_ids))
), covered as (
  -- Only consider branches within the same org (via join to branches)
  select distinct ab.branch_id
  from public.auditor_assignments aa
  cross join lateral unnest(aa.branch_ids) as ab(branch_id)
  join public.branches b2 on b2.id = ab.branch_id
  where (p_org_id is null or b2.org_id = p_org_id)
)
select cb.survey_id,
       cb.survey_title,
       cb.frequency,
       cb.branch_id,
       cb.branch_name
from candidate_branches cb
left join covered c on c.branch_id = cb.branch_id
where c.branch_id is null
  and (
    p_search is null or p_search = '' or
    cb.survey_title ilike '%' || p_search || '%' or
    cb.branch_name  ilike '%' || p_search || '%'
  )
order by cb.survey_title asc, cb.branch_name asc
limit greatest(p_limit, 0)
offset greatest(p_offset, 0);
$$;

-- Helpful indexes
create index if not exists idx_surveys_org_active_freq on public.surveys (org_id, is_active, frequency);
create index if not exists idx_branches_org on public.branches (org_id);
-- auditor_assignments.branch_ids is an array; index may not help for unnest but keep default RLS
