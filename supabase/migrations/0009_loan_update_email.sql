-- Lender CRM — the weekly loan update email
--
-- Three additions, no stage machinery.
--
-- Stages were designed and then deliberately dropped: the person sending the
-- email already knows where the loan is, so a dropdown asking them to say so is
-- a second place for the same fact to go stale. Instead each week opens with
-- last week's email and you change what changed — which is why the body has to
-- be stored rather than just the short note.

-- 1. Last week's email, so next week has somewhere to start.
alter table active_loans
  add column if not exists last_update_body text;

-- 2. How the loan ended. `updates_active` already stops the weekly asking;
--    this records which of the two endings it was, so the Loans page can say
--    how many actually reached closing.
alter table active_loans
  add column if not exists closing_outcome text
    check (closing_outcome in ('sent_to_closing', 'did_not_happen'));

comment on column active_loans.last_update_body is
  'Full text of the most recent weekly update, used to seed the next one.';
comment on column active_loans.closing_outcome is
  'Null while the loan is live. Set when the weekly cadence ends.';

-- 3. The signature block that closes every update. Typed once, in Settings.
alter table users
  add column if not exists email_signature text;

comment on column users.email_signature is
  'Sign-off block appended to the first draft of a loan update email.';
