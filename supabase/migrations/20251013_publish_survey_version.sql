-- Atomic publish: bump survey version and insert sections/questions in one transaction
create or replace function public.publish_survey_version(
  p_survey_id uuid,
  p_sections jsonb,
  p_title text default null,
  p_description text default null,
  p_is_active boolean default null,
  p_frequency text default null,
  p_applicable_branch_ids jsonb default null
) returns integer
language plpgsql
security invoker
as $$
DECLARE
  v_current int;
  v_new int;
BEGIN
  if p_sections is null or jsonb_typeof(p_sections) <> 'array' then
    raise exception 'p_sections must be a JSON array';
  end if;

  -- Lock survey row and bump version
  select version into v_current from surveys where id = p_survey_id for update;
  if v_current is null then
    raise exception 'Survey % not found', p_survey_id;
  end if;
  v_new := v_current + 1;

  update surveys
     set version = v_new,
         title = coalesce(p_title, title),
         description = coalesce(p_description, description),
         is_active = coalesce(p_is_active, is_active),
         frequency = coalesce(p_frequency, frequency),
         applicable_branch_ids = coalesce(p_applicable_branch_ids, applicable_branch_ids),
         updated_at = now()
   where id = p_survey_id;

  -- Insert sections for new version and capture their ordinal mapping
  with secs as (
    select (sec->>'title')::text as title,
           nullif(sec->>'description','') as description,
           coalesce( (sec->>'order')::int, (ord-1) ) as order_num,
           coalesce(sec->'questions','[]'::jsonb) as questions,
           ord
      from jsonb_array_elements(p_sections) with ordinality as t(sec, ord)
  ), ins as (
    insert into survey_sections (survey_id, title, description, order_num, version)
    select p_survey_id, s.title, s.description, s.order_num, v_new
      from secs s
    returning id, order_num
  )
  -- Insert questions for each section based on ordinal mapping
  insert into survey_questions (
    survey_id,
    section_id,
    question_text,
    question_type,
    required,
    order_num,
    is_weighted,
    yes_weight,
    no_weight,
    version
  )
  select p_survey_id,
         i.id as section_id,
         coalesce(qj->>'text','') as question_text,
         coalesce(nullif(qj->>'type',''),'yes_no') as question_type,
         coalesce((qj->>'required')::boolean, false) as required,
         coalesce((qj->>'order')::int, (qord-1)) as order_num,
         coalesce((qj->>'isWeighted')::boolean, false) as is_weighted,
         nullif(qj->>'yesWeight','')::int as yes_weight,
         nullif(qj->>'noWeight','')::int as no_weight,
         v_new
    from secs s
    join ins i on i.order_num = s.order_num
    cross join lateral jsonb_array_elements(s.questions) with ordinality as qq(qj, qord);

  return v_new;
END;
$$;
