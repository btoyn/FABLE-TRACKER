import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SampleBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Institutions" };

export default async function InstitutionsPage() {
  const supabase = await createClient();
  const { data: institutions } = await supabase
    .from("institutions")
    .select("*, lenders(id)")
    .is("deleted_at", null)
    .order("name");

  const list = (institutions ?? []).map((i) => ({
    ...i,
    lenderCount: ((i.lenders ?? []) as { id: string }[]).length,
  }));

  return (
    <>
      <PageHeader
        title="Institutions"
        description={`${list.length} bank${list.length === 1 ? "" : "s"} and credit unions`}
      />
      {list.length === 0 ? (
        <EmptyState
          title="No institutions yet"
          description="Institutions are created automatically when you add lenders."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <ul className="divide-y divide-border">
            {list.map((i) => (
              <li key={i.id}>
                <Link
                  href={`/institutions/${i.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-primary-soft/40"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{i.name}</span>
                      {i.is_sample && <SampleBadge />}
                    </div>
                    <p className="text-sm text-muted">
                      {[i.city, i.territory].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="text-sm text-muted">
                    {i.lenderCount} contact{i.lenderCount === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
