import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

type AuditAction =
  | "create"
  | "update"
  | "soft_delete"
  | "restore"
  | "permanent_delete"
  | "approve"
  | "release";

/** Append to the audit log (spec §7). Failures are swallowed — auditing must
 *  never break the user's action — but logged for diagnosis. */
export async function logAudit(
  supabase: SupabaseClient,
  userId: string,
  entry: {
    entityType: string;
    entityId: string;
    action: AuditAction;
    previousValue?: unknown;
    newValue?: unknown;
    actor?: "user" | "assistant" | "system";
    undoAvailable?: boolean;
  },
): Promise<void> {
  const { error } = await supabase.from("audit_log").insert({
    user_id: userId,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    action_type: entry.action,
    previous_value: entry.previousValue ?? null,
    new_value: entry.newValue ?? null,
    actor: entry.actor ?? "user",
    undo_available: entry.undoAvailable ?? false,
  });
  if (error) console.error("audit log write failed:", error.message);
}
