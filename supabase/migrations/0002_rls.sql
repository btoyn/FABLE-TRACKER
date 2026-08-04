-- Lender CRM — Row Level Security
-- Spec §7: users can only read/update their own records; admin account
-- management does not grant access to private CRM data.
--
-- Every user-owned table carries user_id and gets the same four policies.
-- territories is a global read-only reference table.

-- Helper: generate identical owner policies for a table.
do $$
declare
  t text;
  owned_tables text[] := array[
    'users', 'user_preferences', 'institutions', 'lenders',
    'lender_institution_history', 'lender_personal_details', 'meetings',
    'meeting_attendees', 'meeting_notes', 'activities', 'tasks', 'promises',
    'opportunities', 'opportunity_files', 'sba_questions', 'active_loans',
    'active_loan_recipients', 'campaigns', 'campaign_recipients',
    'campaign_batches', 'assistant_suggestions', 'weekly_relationship_plans',
    'weekly_relationship_plan_items', 'templates', 'trips', 'trip_targets',
    'locations', 'drop_offs', 'expenses', 'monthly_budgets', 'annual_goals',
    'voice_examples', 'voice_preferences', 'audit_log'
  ];
  id_col text;
begin
  foreach t in array owned_tables loop
    -- users and user_preferences key on a different column name
    id_col := case
      when t = 'users' then 'id'
      else 'user_id'
    end;

    execute format('alter table %I enable row level security', t);

    execute format(
      'create policy %I on %I for select using (%I = (select auth.uid()))',
      t || '_select_own', t, id_col
    );
    execute format(
      'create policy %I on %I for insert with check (%I = (select auth.uid()))',
      t || '_insert_own', t, id_col
    );
    execute format(
      'create policy %I on %I for update using (%I = (select auth.uid())) with check (%I = (select auth.uid()))',
      t || '_update_own', t, id_col, id_col
    );
    execute format(
      'create policy %I on %I for delete using (%I = (select auth.uid()))',
      t || '_delete_own', t, id_col
    );
  end loop;
end $$;

-- audit_log is append-only from the user's perspective: no update/delete.
drop policy audit_log_update_own on audit_log;
drop policy audit_log_delete_own on audit_log;

-- users profile row is created by the auth trigger; users may not delete it directly.
drop policy users_delete_own on users;

-- territories: global reference, readable by any signed-in user, never writable.
alter table territories enable row level security;
create policy territories_read on territories
  for select using ((select auth.uid()) is not null);
