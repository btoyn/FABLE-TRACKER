-- Lender CRM — core schema
-- Spec reference: lender_crm_build_spec.md §7 (auth/privacy), §8 (data model)
--
-- Conventions:
--   * Every user-owned table has user_id uuid referencing auth.users, RLS enforced in 0002_rls.sql.
--   * Soft deletion via deleted_at; permanent purge after 90 days (function in 0003).
--   * is_sample marks demo records so a real import can remove them atomically (§14).

create extension if not exists "pg_trgm"; -- typo-tolerant lender search (§12)

-- ---------------------------------------------------------------------------
-- Reference: territories (global, read-only seed per §8)
-- ---------------------------------------------------------------------------
create table territories (
  id serial primary key,
  name text not null unique,
  sort_order int not null default 0
);

insert into territories (name, sort_order) values
  ('Northern Utah', 1),
  ('Wasatch Front', 2),
  ('Southern Utah', 3),
  ('Other', 4);

-- ---------------------------------------------------------------------------
-- users: profile row mirroring auth.users (created by trigger in 0003)
-- ---------------------------------------------------------------------------
create table users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  timezone text not null default 'America/Denver',
  home_city text default 'South Ogden',
  home_state text default 'UT',
  workday_end_time time not null default '17:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_preferences (
  user_id uuid primary key references users (id) on delete cascade,
  daily_digest_enabled boolean not null default true,
  daily_digest_time time not null default '08:00',
  weekday_digest_only boolean not null default true,
  final_missing_notes_email_enabled boolean not null default true,
  default_contact_goal_days int not null default 30,
  contact_grace_days int not null default 10,
  weekly_top_count int not null default 10,
  weekly_on_deck_count int not null default 10,
  default_campaign_batch_size int not null default 25,
  ai_enabled boolean not null default false,
  ai_monthly_spend_limit numeric(8, 2) not null default 25.00,
  theme text not null default 'light',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- institutions
-- ---------------------------------------------------------------------------
create table institutions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  name text not null,
  normalized_name text not null,
  website text,
  main_phone text,
  address text,
  city text,
  state text default 'UT',
  postal_code text,
  territory text,
  notes text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index institutions_user_idx on institutions (user_id) where deleted_at is null;
create index institutions_normalized_idx on institutions (user_id, normalized_name);
create index institutions_name_trgm_idx on institutions using gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- lenders: person records independent of institution (§12)
-- ---------------------------------------------------------------------------
create table lenders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  institution_id uuid references institutions (id) on delete set null,
  first_name text not null,
  last_name text,
  full_name text generated always as (
    first_name || coalesce(' ' || last_name, '')
  ) stored,
  title text,
  role_type text not null default 'commercial_lender' check (role_type in (
    'commercial_lender', 'commercial_lending_manager', 'branch_manager',
    'credit_underwriting', 'executive', 'other_bank_employee'
  )),
  email text,
  mobile_phone text,
  office_phone text,
  address text,
  city text,
  state text default 'UT',
  postal_code text,
  territory text,
  relationship_tier text not null default 'unassigned' check (relationship_tier in ('A', 'B', 'C', 'unassigned')),
  manual_tier_override boolean not null default false,
  relationship_health text check (relationship_health in ('strong', 'steady', 'cooling', 'at_risk', 'new')),
  communication_style text check (communication_style in (
    'casual_conversational', 'warm_professional', 'direct_concise', 'formal_when_needed'
  )),
  preferred_contact_method text check (preferred_contact_method in ('email', 'text', 'call', 'in_person')),
  active boolean not null default true,
  do_not_contact boolean not null default false,
  unsubscribed boolean not null default false,
  email_bounced boolean not null default false,
  needs_enrichment boolean not null default false,
  next_follow_up_at date,
  notes text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index lenders_user_idx on lenders (user_id) where deleted_at is null;
create index lenders_institution_idx on lenders (institution_id);
create index lenders_name_trgm_idx on lenders using gin (full_name gin_trgm_ops);
create index lenders_email_idx on lenders (user_id, email);

-- ---------------------------------------------------------------------------
-- lender_institution_history: preserve relationship across bank changes (§12)
-- ---------------------------------------------------------------------------
create table lender_institution_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  lender_id uuid not null references lenders (id) on delete cascade,
  institution_id uuid references institutions (id) on delete set null,
  title text,
  start_date date,
  end_date date,
  is_current boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create index lih_lender_idx on lender_institution_history (lender_id);

-- ---------------------------------------------------------------------------
-- lender_personal_details: never expire automatically (§8)
-- ---------------------------------------------------------------------------
create table lender_personal_details (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  lender_id uuid not null references lenders (id) on delete cascade,
  category text not null check (category in (
    'long_term_interest', 'life_event', 'family', 'sports', 'golf', 'restaurant',
    'community', 'communication_preference', 'meeting_preference', 'follow_up_topic', 'other'
  )),
  detail text not null,
  source_activity_id uuid,
  captured_date date not null default current_date,
  is_active_suggestion boolean not null default true,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index lpd_lender_idx on lender_personal_details (lender_id) where deleted_at is null;

-- ---------------------------------------------------------------------------
-- meetings (before activities so activities can reference meeting_id)
-- ---------------------------------------------------------------------------
create table meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  institution_id uuid references institutions (id) on delete set null,
  meeting_type text not null check (meeting_type in (
    'lunch', 'breakfast', 'golf', 'office_visit', 'pop_in', 'general'
  )),
  title text not null,
  status text not null default 'proposed' check (status in (
    'proposed', 'tentative', 'confirmed', 'completed', 'canceled'
  )),
  start_at timestamptz,
  end_at timestamptz,
  location_name text,
  address text,
  city text,
  state text,
  territory text,
  confirmed boolean not null default false,
  tentative boolean not null default false,
  external_calendar_event_id text,
  notes_status text not null default 'not_needed' check (notes_status in (
    'not_needed', 'pending', 'captured'
  )),
  meeting_brief_generated_at timestamptz,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index meetings_user_idx on meetings (user_id, start_at) where deleted_at is null;

-- ---------------------------------------------------------------------------
-- opportunities: early referral tracker only (§25)
-- ---------------------------------------------------------------------------
create table opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  lender_id uuid references lenders (id) on delete set null,
  institution_id uuid references institutions (id) on delete set null,
  borrower_name text not null,
  estimated_amount numeric(14, 2),
  structure_summary text,
  property_or_equipment_type text,
  communication_path text check (communication_path in ('lender_led', 'borrower_direct', 'shared')),
  stage text not null default 'initial_inquiry' check (stage in (
    'initial_inquiry', 'sources_uses_sent', 'needs_list_sent', 'documents_pending',
    'ready_for_preflight', 'handed_off', 'dormant', 'closed_no_handoff'
  )),
  received_at date not null default current_date,
  last_activity_at timestamptz,
  next_follow_up_at date,
  follow_up_attempt_count int not null default 0,
  preflight_handoff_date date,
  dormant_reason text,
  notes text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index opportunities_user_idx on opportunities (user_id, stage) where deleted_at is null;

-- ---------------------------------------------------------------------------
-- active_loans: lightweight communication tracker only (§26)
-- ---------------------------------------------------------------------------
create table active_loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  opportunity_id uuid references opportunities (id) on delete set null,
  lender_id uuid references lenders (id) on delete set null,
  institution_id uuid references institutions (id) on delete set null,
  borrower_name text not null,
  loan_amount numeric(14, 2),
  stage text not null default 'processing' check (stage in (
    'processing', 'underwriting', 'board_approved', 'sba_approved'
  )),
  current_blocker text,
  next_milestone text,
  update_style text not null default 'brief' check (update_style in ('brief', 'standard', 'detailed')),
  last_update_sent_at timestamptz,
  next_update_due_at date,
  updates_active boolean not null default true, -- SBA-approved loans drop out of weekly updates unless kept active (§8)
  sba_approval_date date,
  approved_sba_amount numeric(14, 2),
  external_system_url text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index active_loans_user_idx on active_loans (user_id, stage) where deleted_at is null;

create table active_loan_recipients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  active_loan_id uuid not null references active_loans (id) on delete cascade,
  recipient_type text not null check (recipient_type in (
    'referring_lender', 'bank_contact', 'borrower', 'internal'
  )),
  lender_id uuid references lenders (id) on delete set null,
  borrower_name text,
  email text,
  is_primary boolean not null default false,
  receives_updates boolean not null default true
);

create index alr_loan_idx on active_loan_recipients (active_loan_id);

-- ---------------------------------------------------------------------------
-- campaigns (§23)
-- ---------------------------------------------------------------------------
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  name text not null,
  subject text,
  body_template text,
  intent text not null default 'informational' check (intent in (
    'informational', 'response_requested', 'meeting_outreach', 'event_invitation'
  )),
  status text not null default 'draft' check (status in (
    'draft', 'pending_approval', 'approved', 'queued', 'releasing', 'completed', 'canceled'
  )),
  audience_filter jsonb,
  approved_at timestamptz,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  campaign_id uuid not null references campaigns (id) on delete cascade,
  lender_id uuid not null references lenders (id) on delete cascade,
  first_name text,
  email text,
  personalized_intro text,
  personalization_requires_review boolean not null default false,
  personalization_status text not null default 'standard' check (personalization_status in (
    'standard', 'pending_review', 'approved', 'rejected'
  )),
  queue_status text not null default 'queued' check (queue_status in (
    'queued', 'draft_created', 'sent', 'excluded'
  )),
  batch_number int,
  outlook_draft_id text,
  sent_at timestamptz,
  replied_at timestamptz,
  bounced boolean not null default false,
  excluded_reason text
);

create index cr_campaign_idx on campaign_recipients (campaign_id);

create table campaign_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  campaign_id uuid not null references campaigns (id) on delete cascade,
  batch_number int not null,
  batch_size int not null,
  status text not null default 'pending' check (status in ('pending', 'released', 'completed')),
  released_at timestamptz,
  completed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- activities: one unified timeline (§8)
-- ---------------------------------------------------------------------------
create table activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  lender_id uuid references lenders (id) on delete cascade,
  institution_id uuid references institutions (id) on delete set null,
  opportunity_id uuid references opportunities (id) on delete set null,
  active_loan_id uuid references active_loans (id) on delete set null,
  meeting_id uuid references meetings (id) on delete set null,
  campaign_id uuid references campaigns (id) on delete set null,
  activity_type text not null check (activity_type in (
    'personal_email', 'campaign_email', 'incoming_email', 'text', 'call',
    'lunch', 'breakfast', 'golf', 'office_visit', 'pop_in', 'drop_off',
    'general_meeting', 'sba_question', 'deal_conversation', 'loan_update',
    'note', 'task_completed', 'other'
  )),
  direction text not null default 'outbound' check (direction in ('outbound', 'inbound', 'two_way', 'internal')),
  occurred_at timestamptz not null default now(),
  subject text,
  summary text,
  details text,
  meaningful_touch boolean not null default true,
  personal_touch boolean not null default false,
  initiated_by_lender boolean not null default false,
  counts_for_coverage boolean not null default true,
  source text not null default 'manual' check (source in ('manual', 'import', 'assistant', 'outlook', 'system')),
  external_id text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index activities_lender_idx on activities (lender_id, occurred_at desc) where deleted_at is null;
create index activities_user_idx on activities (user_id, occurred_at desc) where deleted_at is null;

alter table lender_personal_details
  add constraint lpd_source_activity_fk
  foreign key (source_activity_id) references activities (id) on delete set null;

-- ---------------------------------------------------------------------------
-- tasks (§8)
-- ---------------------------------------------------------------------------
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  lender_id uuid references lenders (id) on delete cascade,
  institution_id uuid references institutions (id) on delete set null,
  opportunity_id uuid references opportunities (id) on delete set null,
  active_loan_id uuid references active_loans (id) on delete set null,
  meeting_id uuid references meetings (id) on delete set null,
  task_type text not null default 'general' check (task_type in (
    'general', 'follow_up', 'sources_uses', 'meeting_notes', 'loan_update',
    'enrichment', 'drop_off_follow_up', 'other'
  )),
  title text not null,
  description text,
  due_at timestamptz,
  status text not null default 'open' check (status in ('open', 'completed', 'snoozed', 'dismissed')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  source text not null default 'manual' check (source in ('manual', 'assistant', 'system', 'import')),
  assistant_created boolean not null default false,
  completed_at timestamptz,
  snoozed_until timestamptz,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index tasks_user_idx on tasks (user_id, status, due_at) where deleted_at is null;

-- ---------------------------------------------------------------------------
-- promises: more visible than ordinary tasks (§8, §28)
-- ---------------------------------------------------------------------------
create table promises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  lender_id uuid references lenders (id) on delete cascade,
  opportunity_id uuid references opportunities (id) on delete set null,
  active_loan_id uuid references active_loans (id) on delete set null,
  meeting_id uuid references meetings (id) on delete set null,
  direction text not null check (direction in ('i_promised', 'they_promised')),
  description text not null,
  owner_name text,
  due_at date,
  status text not null default 'open' check (status in ('open', 'completed', 'rescheduled', 'dismissed')),
  completed_at timestamptz,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index promises_user_idx on promises (user_id, status, due_at) where deleted_at is null;

-- ---------------------------------------------------------------------------
-- meeting_attendees, meeting_notes (§8, §16, §19)
-- ---------------------------------------------------------------------------
create table meeting_attendees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  meeting_id uuid not null references meetings (id) on delete cascade,
  lender_id uuid not null references lenders (id) on delete cascade,
  response_status text not null default 'invited' check (response_status in (
    'invited', 'awaiting_reply', 'tentative', 'confirmed', 'declined', 'no_response'
  )),
  attended boolean,
  personal_touch_awarded boolean not null default false,
  unique (meeting_id, lender_id)
);

create index ma_meeting_idx on meeting_attendees (meeting_id);

create table meeting_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  meeting_id uuid not null references meetings (id) on delete cascade,
  raw_notes text,
  cleaned_summary text,
  input_method text not null default 'typed' check (input_method in ('speech_to_text', 'typed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- sba_questions: tracked separately from formal opportunities (§25)
-- ---------------------------------------------------------------------------
create table sba_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  lender_id uuid references lenders (id) on delete cascade,
  topic text not null,
  asked_on date not null default current_date,
  response_summary text,
  follow_up_needed boolean not null default false,
  became_opportunity_id uuid references opportunities (id) on delete set null,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------------
-- assistant + weekly plan (§8, §11, §32)
-- ---------------------------------------------------------------------------
create table assistant_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  suggestion_type text not null,
  related_entity_type text,
  related_entity_id uuid,
  title text not null,
  explanation text,
  payload jsonb,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'expired')),
  user_feedback text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table weekly_relationship_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  week_start date not null,
  generated_at timestamptz not null default now(),
  plan_status text not null default 'active' check (plan_status in ('active', 'archived')),
  generation_context jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create table weekly_relationship_plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  plan_id uuid not null references weekly_relationship_plans (id) on delete cascade,
  lender_id uuid not null references lenders (id) on delete cascade,
  list_type text not null check (list_type in ('top', 'on_deck')),
  rank int not null,
  explanation text,
  recommended_action text,
  alternative_actions jsonb,
  estimated_effort_minutes int,
  status text not null default 'open' check (status in ('open', 'completed', 'snoozed', 'replaced', 'rejected')),
  user_feedback text,
  completed_at timestamptz
);

create index wrpi_plan_idx on weekly_relationship_plan_items (plan_id, list_type, rank);

-- ---------------------------------------------------------------------------
-- opportunity_files, templates (§8, §25)
-- ---------------------------------------------------------------------------
create table templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  name text not null,
  category text not null default 'sources_uses',
  file_path text,
  version int not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table opportunity_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  opportunity_id uuid not null references opportunities (id) on delete cascade,
  template_id uuid references templates (id) on delete set null,
  file_type text not null check (file_type in ('internal_excel', 'sendable_pdf', 'image_snippet', 'other')),
  storage_path text not null,
  internal_only boolean not null default false,
  sent_to_contact boolean not null default false,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------------
-- trips + targets (§17)
-- ---------------------------------------------------------------------------
create table trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  name text not null,
  territory text,
  start_date date,
  end_date date,
  status text not null default 'planning' check (status in ('planning', 'scheduled', 'in_progress', 'completed', 'canceled')),
  notes text,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table trip_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  trip_id uuid not null references trips (id) on delete cascade,
  lender_id uuid references lenders (id) on delete cascade,
  institution_id uuid references institutions (id) on delete set null,
  target_type text not null check (target_type in (
    'group_lunch', 'breakfast', 'golf', 'office_visit', 'pop_in_candidate', 'backup_candidate'
  )),
  status text not null default 'candidate' check (status in (
    'candidate', 'invited', 'awaiting_reply', 'tentative', 'confirmed', 'declined'
  )),
  suggested_meeting_type text,
  notes text
);

-- ---------------------------------------------------------------------------
-- locations library (§15)
-- ---------------------------------------------------------------------------
create table locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  name text not null,
  address text,
  city text,
  territory text,
  location_type text not null default 'restaurant' check (location_type in (
    'restaurant', 'golf_course', 'coffee', 'office', 'other'
  )),
  notes text,
  parking_note text,
  noise_level text check (noise_level in ('quiet', 'moderate', 'loud')),
  previously_used boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------------
-- drop_offs: not a completed touch (§29)
-- ---------------------------------------------------------------------------
create table drop_offs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  lender_id uuid references lenders (id) on delete cascade,
  institution_id uuid references institutions (id) on delete set null,
  item text not null,
  drop_off_type text not null check (drop_off_type in ('gift', 'flyer_marketing')),
  approximate_cost numeric(8, 2),
  dropped_on date not null default current_date,
  received_by text,
  follow_up_date date,
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------------------
-- expenses + budgets (§30) — Expensify remains source of truth
-- ---------------------------------------------------------------------------
create table expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  lender_id uuid references lenders (id) on delete set null,
  institution_id uuid references institutions (id) on delete set null,
  trip_id uuid references trips (id) on delete set null,
  meeting_id uuid references meetings (id) on delete set null,
  category text not null check (category in (
    'lender_marketing', 'travel', 'car_mileage', 'meals', 'golf', 'gifts', 'other'
  )),
  amount numeric(10, 2) not null,
  expense_date date not null,
  description text,
  expensify_reference text,
  reconciliation_status text not null default 'pending' check (reconciliation_status in ('pending', 'reconciled')),
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  month int not null check (month between 1 and 12),
  year int not null,
  category text not null check (category in (
    'lender_marketing', 'travel', 'car_mileage', 'meals', 'golf', 'gifts', 'other'
  )),
  budget_amount numeric(10, 2) not null,
  unique (user_id, year, month, category)
);

-- ---------------------------------------------------------------------------
-- annual approval goals (§27)
-- ---------------------------------------------------------------------------
create table annual_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  year int not null,
  approval_goal int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, year)
);

-- ---------------------------------------------------------------------------
-- voice profile (§21)
-- ---------------------------------------------------------------------------
create table voice_examples (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  example_type text not null check (example_type in (
    'personal_outreach', 'scheduling', 'loan_update', 'monthly_campaign', 'text'
  )),
  title text,
  content text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table voice_preferences (
  user_id uuid primary key references users (id) on delete cascade,
  default_tone text not null default 'casual_conversational',
  never_say_phrases text[],
  style_notes text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- audit log (§7)
-- ---------------------------------------------------------------------------
create table audit_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references users (id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  actor text not null default 'user' check (actor in ('user', 'assistant', 'system')),
  action_type text not null check (action_type in (
    'create', 'update', 'soft_delete', 'restore', 'permanent_delete', 'approve', 'release'
  )),
  previous_value jsonb,
  new_value jsonb,
  undo_available boolean not null default false,
  created_at timestamptz not null default now()
);

create index audit_user_idx on audit_log (user_id, created_at desc);
