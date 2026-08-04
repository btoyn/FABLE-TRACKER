-- Lender CRM — functions and triggers

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'users', 'user_preferences', 'institutions', 'lenders',
    'lender_personal_details', 'meetings', 'meeting_notes', 'activities',
    'tasks', 'promises', 'opportunities', 'sba_questions', 'active_loans',
    'campaigns', 'templates', 'trips', 'locations', 'expenses',
    'annual_goals', 'voice_preferences'
  ] loop
    execute format(
      'create trigger %I before update on %I for each row execute function set_updated_at()',
      t || '_updated_at', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- New auth user bootstrap: profile row, preferences, current-year goal
-- ---------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));

  insert into public.user_preferences (user_id) values (new.id);
  insert into public.voice_preferences (user_id) values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- 90-day purge of soft-deleted records (§7)
-- Run daily via pg_cron or a scheduled edge function.
-- ---------------------------------------------------------------------------
create or replace function purge_soft_deleted(retention interval default interval '90 days')
returns table (table_name text, purged bigint)
language plpgsql
security definer set search_path = public
as $$
declare
  t text;
  n bigint;
begin
  foreach t in array array[
    'activities', 'tasks', 'promises', 'meetings', 'lender_personal_details',
    'opportunities', 'opportunity_files', 'sba_questions', 'active_loans',
    'campaigns', 'templates', 'trips', 'locations', 'drop_offs', 'expenses',
    'voice_examples', 'lenders', 'institutions'
  ] loop
    execute format(
      'delete from %I where deleted_at is not null and deleted_at < now() - $1',
      t
    ) using retention;
    get diagnostics n = row_count;
    if n > 0 then
      table_name := t;
      purged := n;
      return next;
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Institution change: preserve lender record + history (§12)
-- ---------------------------------------------------------------------------
create or replace function change_lender_institution(
  p_lender_id uuid,
  p_new_institution_id uuid,
  p_new_title text default null
)
returns void
language plpgsql
as $$
declare
  v_user_id uuid;
  v_old_institution_id uuid;
  v_old_title text;
begin
  select user_id, institution_id, title
    into v_user_id, v_old_institution_id, v_old_title
    from lenders
   where id = p_lender_id
     and user_id = (select auth.uid());

  if v_user_id is null then
    raise exception 'Lender not found';
  end if;

  update lender_institution_history
     set is_current = false, end_date = current_date
   where lender_id = p_lender_id and is_current;

  insert into lender_institution_history
    (user_id, lender_id, institution_id, title, start_date, is_current)
  values
    (v_user_id, p_lender_id, p_new_institution_id, coalesce(p_new_title, v_old_title), current_date, true);

  update lenders
     set institution_id = p_new_institution_id,
         title = coalesce(p_new_title, title)
   where id = p_lender_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Coverage snapshot: last valid touch per lender, visible vs personal (§9)
-- The app computes statuses from these dates; keeping the date logic in SQL
-- makes list screens one query.
-- ---------------------------------------------------------------------------
create or replace view lender_coverage as
select
  l.id as lender_id,
  l.user_id,
  -- any valid touch, campaigns included ("visible")
  greatest(
    (select max(a.occurred_at) from activities a
      where a.lender_id = l.id and a.deleted_at is null and a.counts_for_coverage),
    (select max(m.start_at) from meetings m
      join meeting_attendees ma on ma.meeting_id = m.id
      where ma.lender_id = l.id and m.deleted_at is null
        and m.status = 'confirmed' and m.start_at <= now())
  ) as last_visible_touch_at,
  -- one-to-one interactions only ("personally engaged")
  greatest(
    (select max(a.occurred_at) from activities a
      where a.lender_id = l.id and a.deleted_at is null and a.counts_for_coverage
        and a.activity_type <> 'campaign_email'),
    (select max(m.start_at) from meetings m
      join meeting_attendees ma on ma.meeting_id = m.id
      where ma.lender_id = l.id and m.deleted_at is null
        and m.status = 'confirmed' and m.start_at <= now())
  ) as last_personal_touch_at,
  -- a confirmed FUTURE meeting counts as covered immediately (§9)
  exists (
    select 1 from meetings m
    join meeting_attendees ma on ma.meeting_id = m.id
    where ma.lender_id = l.id and m.deleted_at is null
      and m.status = 'confirmed' and m.start_at > now()
  ) as has_confirmed_future_meeting
from lenders l
where l.deleted_at is null;

-- View runs with the querying user's permissions; RLS on base tables applies.
alter view lender_coverage set (security_invoker = true);
