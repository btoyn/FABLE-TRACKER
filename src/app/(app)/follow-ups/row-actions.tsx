"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  reschedulePromise,
  setPromiseStatus,
  setTaskStatus,
  snoozeTask,
} from "../activity-actions";

export function TaskRowActions({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showSnooze, setShowSnooze] = useState(false);

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1">
      {showSnooze ? (
        <Input
          type="date"
          className="h-8 w-36"
          autoFocus
          onChange={(e) => {
            if (e.target.value) {
              run(() => snoozeTask(taskId, e.target.value));
              setShowSnooze(false);
            }
          }}
        />
      ) : (
        <>
          <Button
            size="sm"
            variant="ghost"
            title="Complete"
            disabled={pending}
            onClick={() => run(() => setTaskStatus(taskId, "completed"))}
          >
            <Check className="h-4 w-4 text-success" />
          </Button>
          <Button size="sm" variant="ghost" title="Snooze" onClick={() => setShowSnooze(true)}>
            <Clock className="h-4 w-4 text-muted" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            title="Dismiss"
            disabled={pending}
            onClick={() => run(() => setTaskStatus(taskId, "dismissed"))}
          >
            <X className="h-4 w-4 text-muted" />
          </Button>
        </>
      )}
    </div>
  );
}

export function PromiseRowActions({ promiseId }: { promiseId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showReschedule, setShowReschedule] = useState(false);

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1">
      {showReschedule ? (
        <Input
          type="date"
          className="h-8 w-36"
          autoFocus
          onChange={(e) => {
            if (e.target.value) {
              run(() => reschedulePromise(promiseId, e.target.value));
              setShowReschedule(false);
            }
          }}
        />
      ) : (
        <>
          <Button
            size="sm"
            variant="ghost"
            title="Done"
            disabled={pending}
            onClick={() => run(() => setPromiseStatus(promiseId, "completed"))}
          >
            <Check className="h-4 w-4 text-success" />
          </Button>
          <Button size="sm" variant="ghost" title="Reschedule" onClick={() => setShowReschedule(true)}>
            <Clock className="h-4 w-4 text-muted" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            title="Dismiss"
            disabled={pending}
            onClick={() => run(() => setPromiseStatus(promiseId, "dismissed"))}
          >
            <X className="h-4 w-4 text-muted" />
          </Button>
        </>
      )}
    </div>
  );
}
