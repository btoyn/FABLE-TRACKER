-- Local test harness: stubs the pieces of a Supabase project that the
-- migrations depend on (auth schema, auth.uid()), so the migration set can be
-- validated against a plain PostgreSQL instance. NOT applied in production.

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Supabase resolves auth.uid() from the request JWT. Locally we read a
-- session-level setting so tests can impersonate users.
create or replace function auth.uid()
returns uuid
language sql stable
as $$
  select nullif(current_setting('test.user_id', true), '')::uuid;
$$;
