import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getFlags } from "@/lib/flags";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const [{ data: profile }, { data: prefs }] = await Promise.all([
    supabase.from("users").select("*").maybeSingle(),
    supabase.from("user_preferences").select("*").maybeSingle(),
  ]);
  const flags = getFlags();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Settings" />

      <div className="space-y-5">
        <SettingsForm
          profile={{
            display_name: profile?.display_name ?? "",
            home_city: profile?.home_city ?? "",
            email: profile?.email ?? "",
          }}
          prefs={{
            default_contact_goal_days: prefs?.default_contact_goal_days ?? 30,
            contact_grace_days: prefs?.contact_grace_days ?? 10,
            weekly_top_count: prefs?.weekly_top_count ?? 10,
            weekly_on_deck_count: prefs?.weekly_on_deck_count ?? 10,
            default_campaign_batch_size: prefs?.default_campaign_batch_size ?? 25,
            daily_digest_enabled: prefs?.daily_digest_enabled ?? true,
            daily_digest_time: (prefs?.daily_digest_time ?? "08:00").slice(0, 5),
          }}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connections</CardTitle>
            <CardDescription>
              The CRM works fully in manual mode — connections add drafting and scheduling help.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ConnectionRow
              name="Microsoft 365"
              enabled={flags.microsoft}
              detail={
                flags.microsoft
                  ? "Connected — Outlook drafts and calendar holds available."
                  : "Not connected. Outlook drafts, availability, and calendar holds turn on once Microsoft credentials are configured. Requires admin consent at your organization."
              }
            />
            <ConnectionRow
              name="AI drafting"
              enabled={flags.ai}
              detail={
                flags.ai
                  ? "On — drafts, meeting-note extraction, and weekly plan reasoning available."
                  : "Off. Add an Anthropic API key to enable drafting in your voice. Everything else keeps working without it."
              }
            />
            <ConnectionRow
              name="Digest email"
              enabled={flags.outboundEmail}
              detail={
                flags.outboundEmail
                  ? "On — the 8:00 AM weekday digest and 5:00 PM note reminders arrive by email."
                  : "Off. Add a Resend API key to receive the daily digest by email. Reminders still show in the app."
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Export your data</CardTitle>
            <CardDescription>
              Everything is yours — download it as CSV any time.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-sm">
            {[
              ["lenders", "Lenders"],
              ["institutions", "Institutions"],
              ["activities", "Activities"],
              ["tasks", "Tasks"],
              ["promises", "Promises"],
              ["opportunities", "Referrals"],
              ["active_loans", "Active loans"],
            ].map(([key, label]) => (
              <a
                key={key}
                href={`/export?entity=${key}`}
                className="rounded-lg border border-border px-3 py-1.5 font-medium hover:bg-primary-soft hover:text-primary"
              >
                {label} CSV
              </a>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ConnectionRow({
  name,
  enabled,
  detail,
}: {
  name: string;
  enabled: boolean;
  detail: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
      <div>
        <p className="font-medium">{name}</p>
        <p className="mt-0.5 text-muted">{detail}</p>
      </div>
      <Badge variant={enabled ? "success" : "muted"}>{enabled ? "On" : "Off"}</Badge>
    </div>
  );
}
