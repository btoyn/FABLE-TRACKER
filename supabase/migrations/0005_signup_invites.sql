-- Lender CRM — signup invitations (§7 authentication, §1.5 privacy by default)
--
-- The workspace is private: sign-ups are closed to the public. To let a
-- specific person in (a coworker reviewing the build, a future loan officer),
-- issue a single-use invite code and share it with them directly.
--
-- The table is unreadable through the API — RLS is on with no policies — so a
-- stranger cannot list valid codes. Two security-definer functions do the work
-- and are the only way in:
--   invite_is_valid(code) -> boolean   checks a code without revealing others
--   redeem_invite(code)   -> boolean   burns the code once an account is made
-- Both are callable by anon because the person using them has no session yet.

create table signup_invites (
  code text primary key,
  -- Who this was issued to, for the audit trail. Not shown to the recipient.
  label text,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  used_by uuid references auth.users(id) on delete set null
);

alter table signup_invites enable row level security;
-- Deliberately no policies: all access goes through the functions below.

create function invite_is_valid(p_code text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from signup_invites
    where lower(code) = lower(trim(p_code))
      and used_at is null
  );
$$;

create function redeem_invite(p_code text)
returns boolean
language plpgsql
security definer
volatile
set search_path = public
as $$
declare
  hit boolean;
begin
  update signup_invites
     set used_at = now(),
         used_by = auth.uid()
   where lower(code) = lower(trim(p_code))
     and used_at is null;

  get diagnostics hit = row_count;
  return hit;
end;
$$;

revoke all on function invite_is_valid(text) from public;
revoke all on function redeem_invite(text) from public;
grant execute on function invite_is_valid(text) to anon, authenticated;
grant execute on function redeem_invite(text) to anon, authenticated;
