-- Lender CRM — self-service invites for the pilot (§1.5, §7)
--
-- Four officers, each with a private workspace. Brandon runs the pilot and
-- needs to add the others without going through a developer.
--
-- signup_invites is unreadable through the API by design (RLS on, no policies),
-- so these security-definer functions are the only way in, and each one checks
-- the caller is an admin. Being an admin grants exactly this: minting and
-- revoking codes. It grants no access to anyone else's CRM data — that
-- separation is the whole point of the per-user policies.

alter table users add column is_admin boolean not null default false;

create function is_workspace_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_admin from users where id = (select auth.uid())), false);
$$;

create function list_signup_invites()
returns table (code text, label text, created_at timestamptz, used_at timestamptz)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not is_workspace_admin() then
    raise exception 'Only an admin can manage invites';
  end if;

  return query
    select i.code, i.label, i.created_at, i.used_at
    from signup_invites i
    order by i.created_at desc;
end;
$$;

create function create_signup_invite(p_label text)
returns text
language plpgsql
security definer
volatile
set search_path = public, extensions
as $$
declare
  new_code text;
begin
  if not is_workspace_admin() then
    raise exception 'Only an admin can create invites';
  end if;

  -- Short enough to read down the phone, random enough not to be guessed.
  new_code := 'invite-' || encode(gen_random_bytes(4), 'hex');
  insert into signup_invites (code, label) values (new_code, p_label);
  return new_code;
end;
$$;

-- Revoking burns the code by marking it used; the row stays as a record of
-- what was issued to whom.
create function revoke_signup_invite(p_code text)
returns boolean
language plpgsql
security definer
volatile
set search_path = public
as $$
declare
  hit boolean;
begin
  if not is_workspace_admin() then
    raise exception 'Only an admin can revoke invites';
  end if;

  update signup_invites
     set used_at = coalesce(used_at, now())
   where code = p_code;

  get diagnostics hit = row_count;
  return hit;
end;
$$;

revoke all on function is_workspace_admin() from public;
revoke all on function list_signup_invites() from public;
revoke all on function create_signup_invite(text) from public;
revoke all on function revoke_signup_invite(text) from public;
grant execute on function is_workspace_admin() to authenticated;
grant execute on function list_signup_invites() to authenticated;
grant execute on function create_signup_invite(text) to authenticated;
grant execute on function revoke_signup_invite(text) to authenticated;
