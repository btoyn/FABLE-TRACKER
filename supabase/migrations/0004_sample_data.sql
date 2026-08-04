-- Lender CRM — sample data lifecycle (§14)
--
-- create_sample_data(user_id): seeds realistic fictional records, all flagged
--   is_sample = true. Called by the app for a brand-new account.
-- delete_sample_data(user_id): removes every sample record. Called (after
--   explicit confirmation) when the user imports their real lender list.
-- Sample and real records are never mixed: the import flow refuses to run
-- until sample data is confirmed for deletion.

create or replace function delete_sample_data(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if p_user_id is distinct from (select auth.uid()) then
    raise exception 'Can only delete your own sample data';
  end if;

  -- Children first (FKs with cascade handle most, but be explicit).
  delete from activities where user_id = p_user_id and is_sample;
  delete from tasks where user_id = p_user_id and is_sample;
  delete from promises where user_id = p_user_id and is_sample;
  delete from meetings where user_id = p_user_id and is_sample;
  delete from sba_questions where user_id = p_user_id and is_sample;
  delete from active_loans where user_id = p_user_id and is_sample;
  delete from opportunities where user_id = p_user_id and is_sample;
  delete from campaigns where user_id = p_user_id and is_sample;
  delete from trips where user_id = p_user_id and is_sample;
  delete from drop_offs where user_id = p_user_id and is_sample;
  delete from expenses where user_id = p_user_id and is_sample;
  delete from lender_personal_details where user_id = p_user_id and is_sample;
  delete from lenders where user_id = p_user_id and is_sample;
  delete from institutions where user_id = p_user_id and is_sample;
end;
$$;

create or replace function has_sample_data(p_user_id uuid)
returns boolean
language sql
security definer set search_path = public
as $$
  select exists (select 1 from lenders where user_id = p_user_id and is_sample and deleted_at is null);
$$;

create or replace function create_sample_data(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_lender record;
  v_rank int := 0;
  v_meeting_id uuid;
  v_opp_id uuid;
  v_loan_id uuid;
  v_trip_id uuid;
  v_campaign_id uuid;
  v_plan_id uuid;
begin
  if p_user_id is distinct from (select auth.uid()) then
    raise exception 'Can only seed your own workspace';
  end if;

  if exists (select 1 from lenders where user_id = p_user_id limit 1) then
    return; -- never seed into a workspace that already has data
  end if;

  -- Institutions (fictional) -----------------------------------------------
  insert into institutions (user_id, name, normalized_name, city, state, territory, is_sample) values
    (p_user_id, 'Wasatch Valley Bank',      'wasatch valley bank',      'Salt Lake City', 'UT', 'Wasatch Front', true),
    (p_user_id, 'Bonneville Community Bank','bonneville community bank','Ogden',          'UT', 'Northern Utah', true),
    (p_user_id, 'Red Rock First Bank',      'red rock first bank',      'St. George',     'UT', 'Southern Utah', true),
    (p_user_id, 'Pioneer Trust Bank',       'pioneer trust bank',       'Provo',          'UT', 'Wasatch Front', true),
    (p_user_id, 'Cache Summit Bank',        'cache summit bank',        'Logan',          'UT', 'Northern Utah', true),
    (p_user_id, 'Dixie Commerce Bank',      'dixie commerce bank',      'Cedar City',     'UT', 'Southern Utah', true),
    (p_user_id, 'Great Basin Credit Union', 'great basin credit union', 'West Jordan',    'UT', 'Wasatch Front', true),
    (p_user_id, 'Uinta National Bank',      'uinta national bank',      'Roosevelt',      'UT', 'Other', true);

  -- Lenders ------------------------------------------------------------------
  insert into lenders (user_id, institution_id, first_name, last_name, title, role_type, email,
                       city, territory, relationship_tier, relationship_health, communication_style, is_sample)
  select p_user_id, i.id, v.first_name, v.last_name, v.title, v.role_type, v.email,
         v.city, i.territory, v.tier, v.health, v.style, true
  from (values
    ('Jake',    'Terrill',  'Commercial Lender',        'commercial_lender',         'jake.terrill@sample.example',  'Salt Lake City', 'wasatch valley bank',       'A', 'strong',  'casual_conversational'),
    ('Marcy',   'Oldham',   'SVP Commercial Lending',   'commercial_lending_manager','marcy.oldham@sample.example',  'Salt Lake City', 'wasatch valley bank',       'A', 'steady',  'warm_professional'),
    ('Dev',     'Prakash',  'Commercial Lender',        'commercial_lender',         'dev.prakash@sample.example',   'Sandy',          'wasatch valley bank',       'B', 'steady',  'direct_concise'),
    ('Colleen', 'Reyes',    'Branch Manager',           'branch_manager',            'colleen.reyes@sample.example', 'Ogden',          'bonneville community bank', 'B', 'cooling', 'warm_professional'),
    ('Stan',    'Whitmore', 'Commercial Lender',        'commercial_lender',         'stan.whitmore@sample.example', 'Ogden',          'bonneville community bank', 'A', 'strong',  'casual_conversational'),
    ('Priya',   'Nair',     'Credit Analyst',           'credit_underwriting',       'priya.nair@sample.example',    'Ogden',          'bonneville community bank', 'C', 'new',     'formal_when_needed'),
    ('Hank',    'Bushman',  'Commercial Lender',        'commercial_lender',         'hank.bushman@sample.example',  'St. George',     'red rock first bank',       'A', 'steady',  'casual_conversational'),
    ('Tessa',   'Calloway', 'Commercial Lender',        'commercial_lender',         'tessa.calloway@sample.example','St. George',     'red rock first bank',       'B', 'cooling', 'warm_professional'),
    ('Ruben',   'Ortega',   'Market President',         'executive',                 'ruben.ortega@sample.example',  'St. George',     'red rock first bank',       'B', 'steady',  'warm_professional'),
    ('Gwen',    'Farnsworth','Commercial Lender',       'commercial_lender',         'gwen.farnsworth@sample.example','Provo',         'pioneer trust bank',        'A', 'strong',  'casual_conversational'),
    ('Miles',   'Denton',   'Commercial Lender',        'commercial_lender',         'miles.denton@sample.example',  'Orem',           'pioneer trust bank',        'C', 'at_risk', 'direct_concise'),
    ('Sofia',   'Andrade',  'Commercial Lending Manager','commercial_lending_manager','sofia.andrade@sample.example','Provo',          'pioneer trust bank',        'B', 'steady',  'warm_professional'),
    ('Curt',    'Hollins',  'Commercial Lender',        'commercial_lender',         'curt.hollins@sample.example',  'Logan',          'cache summit bank',         'B', 'cooling', 'casual_conversational'),
    ('Annie',   'Beck',     'Commercial Lender',        'commercial_lender',         'annie.beck@sample.example',    'Logan',          'cache summit bank',         'C', 'new',     'warm_professional'),
    ('Randall', 'Pierce',   'Commercial Lender',        'commercial_lender',         'randall.pierce@sample.example','Cedar City',     'dixie commerce bank',       'B', 'steady',  'direct_concise'),
    ('Jolene',  'Marsh',    'Branch Manager',           'branch_manager',            'jolene.marsh@sample.example',  'Cedar City',     'dixie commerce bank',       'C', 'cooling', 'warm_professional'),
    ('Ty',      'Gustafson','Commercial Lender',        'commercial_lender',         'ty.gustafson@sample.example',  'West Jordan',    'great basin credit union',  'A', 'strong',  'casual_conversational'),
    ('Elena',   'Vasquez',  'Commercial Lender',        'commercial_lender',         'elena.vasquez@sample.example', 'West Jordan',    'great basin credit union',  'B', 'steady',  'warm_professional'),
    ('Bruce',   'Hadfield', 'Commercial Lender',        'commercial_lender',         'bruce.hadfield@sample.example','Roosevelt',      'uinta national bank',       'C', 'cooling', 'direct_concise'),
    ('Karen',   'Stott',    'Commercial Lender',        'commercial_lender',         'karen.stott@sample.example',   'Salt Lake City', 'wasatch valley bank',       'B', 'steady',  'casual_conversational'),
    ('Omar',    'Haddad',   'Commercial Lender',        'commercial_lender',         'omar.haddad@sample.example',   'Ogden',          'bonneville community bank', 'B', 'steady',  'warm_professional'),
    ('Lacey',   'Draper',   'Commercial Lender',        'commercial_lender',         'lacey.draper@sample.example',  'St. George',     'red rock first bank',       'C', 'new',     'casual_conversational'),
    ('Wade',    'Killpack', 'Commercial Lender',        'commercial_lender',         'wade.killpack@sample.example', 'Provo',          'pioneer trust bank',        'B', 'cooling', 'casual_conversational'),
    ('Iris',    'Chen',     'Credit Analyst',           'credit_underwriting',       'iris.chen@sample.example',     'Salt Lake City', 'wasatch valley bank',       'C', 'new',     'formal_when_needed')
  ) as v(first_name, last_name, title, role_type, email, city, inst_norm, tier, health, style)
  join institutions i
    on i.user_id = p_user_id and i.normalized_name = v.inst_norm;

  -- Current-institution history rows
  insert into lender_institution_history (user_id, lender_id, institution_id, title, start_date, is_current)
  select p_user_id, l.id, l.institution_id, l.title, current_date - 400, true
  from lenders l where l.user_id = p_user_id and l.is_sample;

  -- Personal details -----------------------------------------------------------
  insert into lender_personal_details (user_id, lender_id, category, detail, is_sample)
  select p_user_id, l.id, d.category, d.detail, true
  from lenders l
  join (values
    ('jake.terrill@sample.example',   'golf',   'Plays Bonneville most Fridays, always up for a scramble'),
    ('jake.terrill@sample.example',   'sports', 'Big Utes fan, has football season tickets'),
    ('stan.whitmore@sample.example',  'family', 'Daughter started at Weber State this fall'),
    ('gwen.farnsworth@sample.example','sports', 'Big BYU fan — do not schedule during rivalry week'),
    ('hank.bushman@sample.example',   'golf',   'Member at Sunbrook, prefers early tee times'),
    ('tessa.calloway@sample.example', 'restaurant', 'Loves the Painted Pony in St. George'),
    ('ty.gustafson@sample.example',   'life_event', 'Just closed on a cabin near Bear Lake'),
    ('colleen.reyes@sample.example',  'community', 'On the Ogden Chamber small-business committee'),
    ('marcy.oldham@sample.example',   'communication_preference', 'Prefers a call over email for anything time-sensitive'),
    ('randall.pierce@sample.example', 'follow_up_topic', 'Asked about SBA 504 refi rules — send the summary')
  ) as d(email, category, detail) on d.email = l.email
  where l.user_id = p_user_id and l.is_sample;

  -- Activities: spread recency so every coverage status is represented ---------
  -- rank 0..23 -> days ago 2..71 (3-day steps): on-track, grace, overdue, seriously overdue
  for v_lender in
    select id, row_number() over (order by email) - 1 as rn
    from lenders
    where user_id = p_user_id and is_sample
      -- these three stay personally-untouched so "campaign-covered but
      -- personally overdue" (§9) shows up in the demo
      and email not in ('bruce.hadfield@sample.example', 'jolene.marsh@sample.example', 'miles.denton@sample.example')
  loop
    insert into activities (user_id, lender_id, activity_type, direction, occurred_at,
                            subject, summary, personal_touch, is_sample)
    values (
      p_user_id, v_lender.id,
      (array['personal_email', 'call', 'lunch', 'text', 'office_visit'])[(v_lender.rn % 5) + 1],
      case when v_lender.rn % 4 = 0 then 'two_way' else 'outbound' end,
      now() - make_interval(days => (2 + v_lender.rn * 3)::int),
      'Checked in',
      'Caught up on pipeline and current pricing questions.',
      true, true
    );
  end loop;

  -- A few lenders are campaign-covered but personally overdue (§9):
  -- an old personal touch plus a recent campaign email.
  insert into activities (user_id, lender_id, activity_type, direction, occurred_at, subject, summary, personal_touch, is_sample)
  select p_user_id, l.id, 'personal_email', 'outbound', now() - interval '55 days',
         'Checked in', 'Short check-in email.', true, true
  from lenders l
  where l.user_id = p_user_id and l.is_sample
    and l.email in ('bruce.hadfield@sample.example', 'jolene.marsh@sample.example', 'miles.denton@sample.example');

  insert into activities (user_id, lender_id, activity_type, direction, occurred_at, subject, summary, personal_touch, is_sample)
  select p_user_id, l.id, 'campaign_email', 'outbound', now() - interval '12 days',
         'July SBA 504 rate update', 'Monthly campaign email.', false, true
  from lenders l
  where l.user_id = p_user_id and l.is_sample
    and l.email in ('bruce.hadfield@sample.example', 'jolene.marsh@sample.example', 'miles.denton@sample.example');

  -- Meetings -------------------------------------------------------------------
  -- Upcoming confirmed group lunch (counts as covered immediately)
  insert into meetings (user_id, institution_id, meeting_type, title, status, confirmed,
                        start_at, end_at, location_name, city, territory, notes_status, is_sample)
  select p_user_id, i.id, 'lunch', 'Lunch with Wasatch Valley commercial team', 'confirmed', true,
         now() + interval '3 days' + interval '12 hours', now() + interval '3 days' + interval '13 hours',
         'Market Street Grill', 'Salt Lake City', 'Wasatch Front', 'not_needed', true
  from institutions i where i.user_id = p_user_id and i.normalized_name = 'wasatch valley bank'
  returning id into v_meeting_id;

  insert into meeting_attendees (user_id, meeting_id, lender_id, response_status)
  select p_user_id, v_meeting_id, l.id, 'confirmed'
  from lenders l
  where l.user_id = p_user_id and l.is_sample
    and l.email in ('jake.terrill@sample.example', 'marcy.oldham@sample.example', 'karen.stott@sample.example');

  -- Completed office visit yesterday, notes still missing (drives reminder queue)
  insert into meetings (user_id, institution_id, meeting_type, title, status, confirmed,
                        start_at, end_at, location_name, city, territory, notes_status, is_sample)
  select p_user_id, i.id, 'office_visit', 'Office visit — Stan Whitmore', 'completed', true,
         now() - interval '1 day', now() - interval '1 day' + interval '15 minutes',
         'Bonneville Community Bank', 'Ogden', 'Northern Utah', 'pending', true
  from institutions i where i.user_id = p_user_id and i.normalized_name = 'bonneville community bank'
  returning id into v_meeting_id;

  insert into meeting_attendees (user_id, meeting_id, lender_id, response_status, attended)
  select p_user_id, v_meeting_id, l.id, 'confirmed', true
  from lenders l where l.user_id = p_user_id and l.email = 'stan.whitmore@sample.example';

  -- Promises --------------------------------------------------------------------
  insert into promises (user_id, lender_id, direction, description, due_at, status, is_sample)
  select p_user_id, l.id, p.direction, p.description, current_date + p.due_in, 'open', true
  from lenders l
  join (values
    ('jake.terrill@sample.example',   'i_promised',    'Send the updated 504 vs 7(a) comparison one-pager', -2),
    ('gwen.farnsworth@sample.example','i_promised',    'Intro to the equipment appraiser we used in Provo',  3),
    ('hank.bushman@sample.example',   'they_promised', 'Sending borrower financials for the hotel deal',    -1),
    ('sofia.andrade@sample.example',  'they_promised', 'Will confirm which branch handles their CRE pipeline', 5)
  ) as p(email, direction, description, due_in) on p.email = l.email
  where l.user_id = p_user_id and l.is_sample;

  -- Opportunities -----------------------------------------------------------------
  insert into opportunities (user_id, lender_id, institution_id, borrower_name, estimated_amount,
                             structure_summary, property_or_equipment_type, communication_path,
                             stage, received_at, next_follow_up_at, follow_up_attempt_count, is_sample)
  select p_user_id, l.id, l.institution_id, o.borrower, o.amount, o.structure, o.ptype,
         'lender_led', o.stage, current_date - o.received_days_ago, current_date + o.next_fu, o.attempts, true
  from lenders l
  join (values
    ('jake.terrill@sample.example', 'Summit Peak Fitness LLC',   1850000, '50% bank / 40% 504 / 10% down', 'Owner-occupied gym build-out', 'sources_uses_sent', 9, 2, 1),
    ('hank.bushman@sample.example', 'Red Cliffs Dental',         2400000, '50/40/10 purchase',             'Medical office purchase',      'initial_inquiry',   2, 5, 0),
    ('ty.gustafson@sample.example', 'Jordan Landing Auto Care',   950000, '50/40/10 with equipment',       'Auto shop + equipment',        'documents_pending', 24, 7, 2)
  ) as o(email, borrower, amount, structure, ptype, stage, received_days_ago, next_fu, attempts)
    on o.email = l.email
  where l.user_id = p_user_id and l.is_sample;

  -- Active loans --------------------------------------------------------------------
  insert into active_loans (user_id, lender_id, institution_id, borrower_name, loan_amount, stage,
                            current_blocker, next_milestone, update_style,
                            last_update_sent_at, next_update_due_at, is_sample)
  select p_user_id, l.id, l.institution_id, a.borrower, a.amount, a.stage,
         a.blocker, a.milestone, 'brief',
         now() - make_interval(days => a.last_upd), current_date + a.due_in, true
  from lenders l
  join (values
    ('stan.whitmore@sample.example',  'Ogden Canyon Lodge LLC', 3100000, 'underwriting', 'Waiting on updated appraisal', 'Credit committee next week', 9, -2),
    ('gwen.farnsworth@sample.example','Provo Craft Bakery',      780000, 'processing',   null, 'Complete file to underwriting', 3, 4),
    ('marcy.oldham@sample.example',   'Wasatch Machining Inc',  2050000, 'board_approved', null, 'SBA submission', 6, 1)
  ) as a(email, borrower, amount, stage, blocker, milestone, last_upd, due_in)
    on a.email = l.email
  where l.user_id = p_user_id and l.is_sample;

  insert into active_loan_recipients (user_id, active_loan_id, recipient_type, lender_id, is_primary)
  select p_user_id, al.id, 'referring_lender', al.lender_id, true
  from active_loans al where al.user_id = p_user_id and al.is_sample;

  -- One SBA-approved loan for YTD goal tracking
  insert into active_loans (user_id, lender_id, institution_id, borrower_name, loan_amount, stage,
                            update_style, updates_active, sba_approval_date, approved_sba_amount, is_sample)
  select p_user_id, l.id, l.institution_id, 'Beehive Storage Partners', 1600000, 'sba_approved',
         'brief', false, current_date - 40, 640000, true
  from lenders l where l.user_id = p_user_id and l.email = 'jake.terrill@sample.example';

  insert into annual_goals (user_id, year, approval_goal)
  values (p_user_id, extract(year from current_date)::int, 30)
  on conflict (user_id, year) do nothing;

  -- Campaign -------------------------------------------------------------------------
  insert into campaigns (user_id, name, subject, body_template, intent, status, is_sample)
  values (p_user_id, 'July 504 rate update', 'Quick July 504 rate note',
          E'Hi {{first_name}},\n\nJuly''s 504 debenture rate landed and it''s worth a look for any owner-occupied deals on your desk. Happy to run numbers side-by-side with conventional any time.\n\nTalk soon,',
          'informational', 'completed', true)
  returning id into v_campaign_id;

  insert into campaign_recipients (user_id, campaign_id, lender_id, first_name, email, queue_status, sent_at)
  select p_user_id, v_campaign_id, l.id, l.first_name, l.email, 'sent', now() - interval '12 days'
  from lenders l where l.user_id = p_user_id and l.is_sample limit 12;

  -- St. George trip ---------------------------------------------------------------------
  insert into trips (user_id, name, territory, start_date, end_date, status, notes, is_sample)
  values (p_user_id, 'St. George trip — sample', 'Southern Utah',
          current_date + 21, current_date + 24, 'planning',
          'Sample four-day southern swing. Group lunch + golf block + office visits.', true)
  returning id into v_trip_id;

  insert into trip_targets (user_id, trip_id, lender_id, institution_id, target_type, status)
  select p_user_id, v_trip_id, l.id, l.institution_id,
         case l.email
           when 'hank.bushman@sample.example'   then 'golf'
           when 'tessa.calloway@sample.example' then 'group_lunch'
           when 'ruben.ortega@sample.example'   then 'group_lunch'
           when 'lacey.draper@sample.example'   then 'pop_in_candidate'
           when 'randall.pierce@sample.example' then 'office_visit'
           else 'backup_candidate'
         end,
         'candidate'
  from lenders l
  where l.user_id = p_user_id and l.is_sample and l.territory = 'Southern Utah';

  -- Tasks ----------------------------------------------------------------------------------
  insert into tasks (user_id, lender_id, task_type, title, due_at, status, priority, is_sample)
  select p_user_id, l.id, t.task_type, t.title, now() + make_interval(days => t.due_in), 'open', t.priority, true
  from lenders l
  join (values
    ('jake.terrill@sample.example',  'follow_up',   'Follow up on Summit Peak Sources & Uses', 1, 'high'),
    ('priya.nair@sample.example',    'enrichment',  'Add phone + territory for Priya Nair',    2, 'normal'),
    ('curt.hollins@sample.example',  'follow_up',   'Reconnect — no personal touch in 6 weeks', 3, 'normal')
  ) as t(email, task_type, title, due_in, priority) on t.email = l.email
  where l.user_id = p_user_id and l.is_sample;

  -- Weekly plan (Top 10 / On Deck example) ---------------------------------------------------
  insert into weekly_relationship_plans (user_id, week_start, generation_context)
  values (p_user_id, date_trunc('week', current_date)::date, '{"source": "sample"}')
  returning id into v_plan_id;

  insert into weekly_relationship_plan_items
    (user_id, plan_id, lender_id, list_type, rank, explanation, recommended_action, estimated_effort_minutes)
  select p_user_id, v_plan_id, x.id,
         case when x.rn <= 10 then 'top' else 'on_deck' end,
         case when x.rn <= 10 then x.rn else x.rn - 10 end,
         'Sample recommendation — personal touch is overdue and there is an open item to move forward.',
         'Send a short personal check-in email', 10
  from (
    select l.id, row_number() over (order by l.email) as rn
    from lenders l
    where l.user_id = p_user_id and l.is_sample
    limit 20
  ) x;
end;
$$;
