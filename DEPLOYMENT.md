# Deployment checklist

You chose to provision infrastructure later. This is the reminder. 🙂
Work top to bottom; the app is unusable until step 2 is done.

## 1. Supabase project (~10 min)

Your org already has two active projects (IMBL Portal, Golf App). On the free
tier only two can be active, so this third project may need the $10/mo Pro
plan — still well inside the spec's $50/mo budget.

1. Create a project at [database.new](https://database.new) (name: `lender-crm`,
   region: `us-west-2` to match your others).
2. Apply migrations **in order** via the SQL editor (or `supabase db push`):
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_rls.sql`
   - `supabase/migrations/0003_functions.sql`
   - `supabase/migrations/0004_sample_data.sql`
3. Auth settings → URL configuration: set the site URL to your Vercel domain
   and add `https://<domain>/auth/callback` to redirect URLs.
4. (Recommended) Enable daily backups (Pro plan includes them).
5. (Later) Schedule the purge: `select purge_soft_deleted();` daily via
   pg_cron or a Supabase scheduled edge function.

## 2. Vercel project (~5 min)

1. Import this GitHub repo into the IMBL Vercel team as a new project.
2. Set environment variables:

   | Variable | Value | Required |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | ✅ |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API (anon/publishable) | ✅ |
   | `ANTHROPIC_API_KEY` | console.anthropic.com | optional — turns on AI drafting |
   | `AI_MODEL` | defaults to `claude-sonnet-5` | optional |
   | `RESEND_API_KEY` | resend.com (free tier: 3,000/mo) | optional — email digest |
   | `EMAIL_FROM` | e.g. `Lender CRM <crm@yourdomain>` (verified in Resend) | with Resend |

3. Deploy. Visit the URL — you should see the login screen, not the setup
   notice.

## 2b. Dashboard hero image — done

The hero photograph lives at `public/images/mountain-sunrise-header.png`
(2172×724). It is served through `next/image`, so the 1.7 MB source is
re-encoded and resized per device — about 37 KB of WebP on a desktop and 9 KB on
a phone. To swap the picture later, replace that file; no code changes needed.

## 3. First run

1. Create your account (this is the separate CRM login, not Microsoft).
2. The dashboard seeds itself with **sample data** so every screen is alive.
3. Go to **Import**, upload your real lender Excel file, confirm sample-data
   removal, review the mapping, and import.

## 4. Later phases (don't need decisions now)

- **Microsoft 365**: register an Entra app (Graph: Calendars.ReadWrite,
  Mail.ReadWrite for drafts), set `MICROSOFT_CLIENT_ID` etc. The Settings
  screen already shows connection status; adapters are stubbed.
- **Resend domain verification** for nicer from-addresses.
- **Daily digest cron**: a Vercel cron hitting an API route at 8:00 AM
  America/Denver (14:00 UTC in daylight time, Mon–Fri) — route to be added with the
  digest feature.
