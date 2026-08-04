-- Smoke test for the migration set. Run after local_harness.sql + migrations.
-- Uses two fake users to prove bootstrap, sample data lifecycle, and RLS isolation.

\set ON_ERROR_STOP on

-- Non-superuser role so RLS actually applies
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'app_test') then
    create role app_test nologin;
  end if;
end $$;
grant usage on schema public, auth to app_test;
grant all on all tables in schema public to app_test;
grant all on all sequences in schema public to app_test;
grant select on auth.users to app_test;
grant execute on all functions in schema public to app_test;

-- Two users; the auth trigger must bootstrap profile + preferences
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'brandon@example.com'),
  ('00000000-0000-0000-0000-000000000002', 'other@example.com');

do $$ begin
  assert (select count(*) from public.users) = 2, 'auth trigger should create profile rows';
  assert (select count(*) from public.user_preferences) = 2, 'auth trigger should create preferences';
  assert (select default_contact_goal_days from public.user_preferences
          where user_id = '00000000-0000-0000-0000-000000000001') = 30, '30-day default goal';
  assert (select contact_grace_days from public.user_preferences
          where user_id = '00000000-0000-0000-0000-000000000001') = 10, '10-day default grace';
end $$;

-- Seed sample data as user 1
set role app_test;
set test.user_id = '00000000-0000-0000-0000-000000000001';
select create_sample_data('00000000-0000-0000-0000-000000000001');

do $$ begin
  assert (select count(*) from lenders) between 20 and 30, 'sample lenders in 20-30 range';
  assert (select count(*) from institutions) between 6 and 8, 'sample institutions in 6-8 range';
  assert (select count(*) from lenders where not is_sample) = 0, 'all seeded lenders flagged sample';
  assert (select count(*) from promises) >= 4, 'sample promises exist';
  assert (select count(*) from opportunities) >= 3, 'sample opportunities exist';
  assert (select count(*) from active_loans) >= 4, 'sample active loans exist';
  assert (select count(*) from meetings where notes_status = 'pending') = 1, 'one meeting missing notes';
  assert (select count(*) from weekly_relationship_plan_items where list_type = 'top') = 10, 'top 10 sample';
  assert has_sample_data('00000000-0000-0000-0000-000000000001'), 'has_sample_data true';
end $$;

-- Coverage view: campaign-only lenders are visible-covered but not personally covered
do $$
declare
  v_visible timestamptz;
  v_personal timestamptz;
begin
  select c.last_visible_touch_at, c.last_personal_touch_at
    into v_visible, v_personal
    from lender_coverage c
    join lenders l on l.id = c.lender_id
   where l.email = 'bruce.hadfield@sample.example';
  assert v_visible > now() - interval '13 days', 'campaign email counts as visible touch';
  assert v_personal < now() - interval '13 days', 'campaign email must NOT count as personal touch';
end $$;

-- Confirmed future meeting flag (§9: counts as covered immediately)
do $$ begin
  assert (select has_confirmed_future_meeting from lender_coverage c
          join lenders l on l.id = c.lender_id
          where l.email = 'jake.terrill@sample.example'), 'future confirmed meeting covers lender';
end $$;

-- RLS isolation: user 2 must see nothing of user 1
set test.user_id = '00000000-0000-0000-0000-000000000002';
do $$ begin
  assert (select count(*) from lenders) = 0, 'user 2 cannot see user 1 lenders';
  assert (select count(*) from activities) = 0, 'user 2 cannot see user 1 activities';
  assert (select count(*) from promises) = 0, 'user 2 cannot see user 1 promises';
  assert (select count(*) from campaigns) = 0, 'user 2 cannot see user 1 campaigns';
  assert (select count(*) from lender_coverage) = 0, 'coverage view respects RLS';
end $$;

-- User 2 cannot delete user 1's sample data
do $$
declare ok boolean := false;
begin
  begin
    perform delete_sample_data('00000000-0000-0000-0000-000000000001');
  exception when others then ok := true;
  end;
  assert ok, 'delete_sample_data must reject other users';
end $$;

-- Sample data removal as user 1 (the import-confirmation path)
set test.user_id = '00000000-0000-0000-0000-000000000001';
select delete_sample_data('00000000-0000-0000-0000-000000000001');
do $$ begin
  assert (select count(*) from lenders) = 0, 'sample lenders removed';
  assert (select count(*) from institutions) = 0, 'sample institutions removed';
  assert (select count(*) from activities) = 0, 'sample activities removed';
  assert not has_sample_data('00000000-0000-0000-0000-000000000001'), 'has_sample_data false after delete';
end $$;

-- Soft-delete + 90-day purge
insert into institutions (user_id, name, normalized_name)
values ('00000000-0000-0000-0000-000000000001', 'Test Bank', 'test bank');
insert into lenders (user_id, first_name, last_name, institution_id)
select '00000000-0000-0000-0000-000000000001', 'Purge', 'Me', id from institutions where normalized_name = 'test bank';

update lenders set deleted_at = now() - interval '91 days' where first_name = 'Purge';
reset role;
select * from purge_soft_deleted();
set role app_test;
do $$ begin
  assert (select count(*) from lenders where first_name = 'Purge') = 0, '91-day-old soft-deleted row purged';
end $$;
update lenders set deleted_at = now() - interval '10 days' where false; -- no-op guard

-- Institution change preserves history
do $$
declare
  v_lender uuid;
  v_inst2 uuid;
begin
  insert into institutions (user_id, name, normalized_name)
  values ('00000000-0000-0000-0000-000000000001', 'Second Bank', 'second bank')
  returning id into v_inst2;

  insert into lenders (user_id, first_name, last_name, institution_id)
  select '00000000-0000-0000-0000-000000000001', 'Mover', 'Jones', id
  from institutions where normalized_name = 'test bank'
  returning id into v_lender;

  insert into lender_institution_history (user_id, lender_id, institution_id, is_current, start_date)
  select '00000000-0000-0000-0000-000000000001', v_lender, institution_id, true, current_date - 100
  from lenders where id = v_lender;

  perform change_lender_institution(v_lender, v_inst2, 'VP Lending');

  assert (select institution_id from lenders where id = v_lender) = v_inst2, 'lender moved';
  assert (select count(*) from lender_institution_history where lender_id = v_lender) = 2, 'history preserved';
  assert (select count(*) from lender_institution_history where lender_id = v_lender and is_current) = 1, 'one current';
end $$;

reset role;
select 'ALL SMOKE TESTS PASSED' as result;
