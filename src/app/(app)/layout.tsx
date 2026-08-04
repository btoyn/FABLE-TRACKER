import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { getNavCounts } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const counts = await getNavCounts();

  return (
    <AppShell userEmail={user.email} counts={counts}>
      {children}
    </AppShell>
  );
}
