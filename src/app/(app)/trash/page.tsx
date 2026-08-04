import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { TrashRowActions } from "./trash-row";

export const metadata = { title: "Trash" };

interface TrashItem {
  table: string;
  typeLabel: string;
  id: string;
  label: string;
  deleted_at: string;
}

export default async function TrashPage() {
  const supabase = await createClient();

  const sources: { table: string; typeLabel: string; select: string; label: (r: Record<string, unknown>) => string }[] = [
    { table: "lenders", typeLabel: "Lender", select: "id, full_name, deleted_at", label: (r) => String(r.full_name) },
    { table: "institutions", typeLabel: "Institution", select: "id, name, deleted_at", label: (r) => String(r.name) },
    { table: "activities", typeLabel: "Activity", select: "id, activity_type, subject, deleted_at", label: (r) => String(r.subject ?? r.activity_type) },
    { table: "tasks", typeLabel: "Task", select: "id, title, deleted_at", label: (r) => String(r.title) },
    { table: "promises", typeLabel: "Promise", select: "id, description, deleted_at", label: (r) => String(r.description) },
    { table: "meetings", typeLabel: "Meeting", select: "id, title, deleted_at", label: (r) => String(r.title) },
    { table: "opportunities", typeLabel: "Referral", select: "id, borrower_name, deleted_at", label: (r) => String(r.borrower_name) },
    { table: "active_loans", typeLabel: "Active loan", select: "id, borrower_name, deleted_at", label: (r) => String(r.borrower_name) },
  ];

  const results = await Promise.all(
    sources.map((s) =>
      supabase
        .from(s.table)
        .select(s.select)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false })
        .limit(100)
        .then((res) => ({ source: s, rows: (res.data ?? []) as unknown as Record<string, unknown>[] })),
    ),
  );

  const items: TrashItem[] = results
    .flatMap(({ source, rows }) =>
      rows.map((r) => ({
        table: source.table,
        typeLabel: source.typeLabel,
        id: String(r.id),
        label: source.label(r),
        deleted_at: String(r.deleted_at),
      })),
    )
    .sort((a, b) => b.deleted_at.localeCompare(a.deleted_at));

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Trash"
        description="Deleted records stay here for 90 days, then they're gone for good."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{items.length} deleted record{items.length === 1 ? "" : "s"}</CardTitle>
          <CardDescription>Restore anything, or delete it permanently right now.</CardDescription>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <EmptyState title="Trash is empty" className="py-8" />
          ) : (
            <ul className="divide-y divide-border text-sm">
              {items.map((item) => (
                <li key={`${item.table}:${item.id}`} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.label}</p>
                    <p className="text-xs text-muted">
                      {item.typeLabel} · deleted {formatDate(item.deleted_at)} · gone permanently{" "}
                      {formatDate(new Date(new Date(item.deleted_at).getTime() + 90 * 86_400_000))}
                    </p>
                  </div>
                  <TrashRowActions table={item.table} id={item.id} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
