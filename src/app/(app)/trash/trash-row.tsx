"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { permanentlyDelete, restoreRecord } from "./actions";

export function TrashRowActions({ table, id }: { table: string; id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  if (confirming) {
    return (
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="text-xs text-danger">Forever?</span>
        <Button size="sm" variant="danger" disabled={pending} onClick={() => run(() => permanentlyDelete(table, id))}>
          Yes, delete
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => restoreRecord(table, id))}>
        Restore
      </Button>
      <Button size="sm" variant="ghost" className="text-danger" onClick={() => setConfirming(true)}>
        Delete now
      </Button>
    </div>
  );
}
