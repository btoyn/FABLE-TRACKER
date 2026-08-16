-- Lender CRM — meeting scheduling (§15)
--
-- The flow this supports, deliberately email-first:
--   1. Ask the lender by email, offering two specific dates
--   2. They reply in their own words
--   3. Accept → book it. Counter-offer → check the calendar, then ask Brandon.
--
-- A proposal is not a meeting, so it gets its own table. Two candidate dates
-- don't fit one meetings row, and most proposals never become a meeting at all.
-- meetings stays the record of things that are actually happening.

-- ---------------------------------------------------------------------------
-- Availability: when each kind of meeting is even possible.
-- ---------------------------------------------------------------------------
-- One row per meeting type, holding the weekdays that work and a single time
-- window. That matches how the rules get described out loud ("lunches Tuesday
-- and Thursday, 11 to 1") and keeps the settings screen to one line per type.
-- Splitting a type across different windows on different days would need the
-- unique constraint dropped; no reason to carry that complexity yet.
create table availability_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  meeting_type text not null check (meeting_type in (
    'lunch', 'breakfast', 'golf', 'office_visit', 'general'
  )),
  -- 0 = Sunday, matching JavaScript's getDay(), so no translation layer.
  weekdays smallint[] not null default '{}',
  -- Minutes from midnight, local time. Times of day, not instants — a lunch
  -- window is 11am wherever he is, so a timestamptz would be actively wrong.
  start_minute smallint not null check (start_minute between 0 and 1439),
  end_minute smallint not null check (end_minute between 0 and 1439),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_window_ordered check (end_minute > start_minute),
  unique (user_id, meeting_type)
);

create index availability_rules_user_idx on availability_rules (user_id);

-- ---------------------------------------------------------------------------
-- Proposals: the ask, and everything that happens to it.
-- ---------------------------------------------------------------------------
create table meeting_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  lender_id uuid not null references lenders (id) on delete cascade,
  meeting_type text not null check (meeting_type in (
    'lunch', 'breakfast', 'golf', 'office_visit', 'general'
  )),
  -- What to call it when meeting_type is 'general' — "range day", "ballgame".
  custom_label text,

  -- The dates offered, in the order they appeared in the email, so a reply of
  -- "the second one works" can be resolved without re-deriving anything.
  offered_slots timestamptz[] not null check (array_length(offered_slots, 1) between 1 and 3),
  location_name text,

  -- The note as it actually went out, kept so the follow-up can refer back to
  -- what was said rather than guessing.
  message_subject text,
  message_body text,

  status text not null default 'draft' check (status in (
    'draft',      -- composed, not sent
    'sent',       -- waiting on a reply
    'accepted',   -- they took one of the offered slots
    'countered',  -- they proposed something else; needs Brandon
    'declined',   -- no, and no counter
    'booked',     -- turned into a meeting
    'expired',    -- every offered date has passed unanswered
    'canceled'    -- called off by hand
  )),

  sent_at timestamptz,
  -- Set when a reply is recorded, however it arrives — pasted in today, read
  -- from Outlook once Microsoft is connected.
  replied_at timestamptz,
  reply_text text,
  -- What they proposed instead, once it has been read out of the reply.
  countered_slot timestamptz,
  -- Whether that counter fits the availability rules, so the "schedule it?"
  -- prompt can warn before Brandon says yes.
  countered_conflicts boolean,

  -- Last time he nudged them, so a second nudge doesn't fire the next day.
  last_nudged_at timestamptz,
  meeting_id uuid references meetings (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index meeting_proposals_user_status_idx
  on meeting_proposals (user_id, status)
  where deleted_at is null;
create index meeting_proposals_lender_idx on meeting_proposals (lender_id);
-- Drives the "nobody answered" sweep.
create index meeting_proposals_waiting_idx
  on meeting_proposals (user_id, sent_at)
  where status = 'sent' and deleted_at is null;

-- Naming an "other" meeting carries through to the meeting itself, so the
-- calendar entry says what he called it rather than just "Meeting".
alter table meetings add column custom_label text;

-- ---------------------------------------------------------------------------
-- Preferences
-- ---------------------------------------------------------------------------
alter table user_preferences
  -- How far ahead to look for open dates.
  add column propose_horizon_days int not null default 14
    check (propose_horizon_days between 3 and 90),
  -- Days of silence before a proposal surfaces as needing a nudge.
  add column proposal_chase_days int not null default 4
    check (proposal_chase_days between 1 and 30),
  -- How many dates to offer in one email.
  add column proposal_slot_count int not null default 2
    check (proposal_slot_count between 1 and 3);

-- ---------------------------------------------------------------------------
-- RLS — same owner-only policies every other table gets (§7).
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['availability_rules', 'meeting_proposals'] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy %I on %I for select using (user_id = (select auth.uid()))',
      t || '_select_own', t
    );
    execute format(
      'create policy %I on %I for insert with check (user_id = (select auth.uid()))',
      t || '_insert_own', t
    );
    execute format(
      'create policy %I on %I for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t || '_update_own', t
    );
    execute format(
      'create policy %I on %I for delete using (user_id = (select auth.uid()))',
      t || '_delete_own', t
    );
  end loop;
end $$;
