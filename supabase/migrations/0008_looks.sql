-- Lender CRM — looks from lenders
--
-- The `opportunities` table was built for deals that arrive fully formed: a
-- named borrower, a structure, a sources-and-uses. Most conversations aren't
-- that. A lender asks whether a dental practice buying its building would
-- qualify, or floats "I might have something in Cedar City" — no borrower, no
-- numbers, but a real reason to follow up, and the clearest signal available
-- of who is actually reaching out.
--
-- Two changes let the table hold that lighter thing:
--   1. borrower_name becomes optional. Often there isn't one yet.
--   2. a follow-up interval preference, so the clock is the user's to set.

alter table opportunities alter column borrower_name drop not null;

alter table user_preferences
  add column if not exists look_follow_up_days int not null default 3;

comment on column opportunities.borrower_name is
  'Optional. Null when a lender raised a possible deal without naming one.';
comment on column opportunities.notes is
  'What the lender actually asked or described. The substance of the record.';
comment on column user_preferences.look_follow_up_days is
  'Days after a look is logged before the follow-up comes due.';
