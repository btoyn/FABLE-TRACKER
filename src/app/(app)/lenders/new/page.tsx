import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { AddLenderForm } from "./add-lender-form";

export const metadata = { title: "Add lender" };

export default async function NewLenderPage() {
  const supabase = await createClient();
  const { data: institutions } = await supabase
    .from("institutions")
    .select("id, name")
    .is("deleted_at", null)
    .order("name");

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Add lender"
        description="Only name and institution are required — fill in the rest when you have it."
      />
      <AddLenderForm institutionNames={(institutions ?? []).map((i) => i.name)} />
    </div>
  );
}
