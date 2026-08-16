"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { createInvite, revokeInvite, type InviteRow } from "./invite-actions";

/** Adding the other loan officers, without going through a developer. */
export function InvitesCard({ initialInvites }: { initialInvites: InviteRow[] }) {
  const [invites, setInvites] = useState(initialInvites);
  const [label, setLabel] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function add() {
    setError(null);
    startTransition(async () => {
      const result = await createInvite(label);
      if (result.error || !result.code) {
        setError(result.error ?? "Could not create a code.");
        return;
      }
      setInvites((prev) => [
        { code: result.code!, label, createdAt: new Date().toISOString(), usedAt: null },
        ...prev,
      ]);
      setLabel("");
    });
  }

  function revoke(code: string) {
    startTransition(async () => {
      await revokeInvite(code);
      setInvites((prev) =>
        prev.map((i) => (i.code === code ? { ...i, usedAt: new Date().toISOString() } : i)),
      );
    });
  }

  const open = invites.filter((i) => !i.usedAt);
  const spent = invites.filter((i) => i.usedAt);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Invite a loan officer</CardTitle>
        <CardDescription>
          Each code works once. Whoever uses it gets their own private workspace — they
          won&apos;t see your lenders, and you won&apos;t see theirs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[12rem] flex-1">
            <Label htmlFor="invite-label">Who is it for?</Label>
            <Input
              id="invite-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Dave in Cedar City"
            />
          </div>
          <Button type="button" onClick={add} disabled={pending || !label.trim()}>
            <Plus className="h-4 w-4" />
            Create code
          </Button>
        </div>

        {error && <p className="text-[13.5px] text-danger">{error}</p>}

        {open.length > 0 && (
          <ul className="divide-y divide-hairline rounded-xl border border-border">
            {open.map((invite) => (
              <li key={invite.code} className="flex flex-wrap items-center gap-2 px-3.5 py-2.5">
                <code className="rounded-md bg-background px-2 py-1 font-mono text-[13px] font-semibold">
                  {invite.code}
                </code>
                <span className="min-w-0 flex-1 truncate text-[13px] text-muted">
                  {invite.label}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(invite.code);
                    setCopied(invite.code);
                    setTimeout(() => setCopied(null), 2000);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12.5px] font-semibold text-primary hover:bg-primary-soft"
                >
                  {copied === invite.code ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied === invite.code ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={() => revoke(invite.code)}
                  disabled={pending}
                  className="rounded-lg px-2 py-1 text-[12.5px] font-medium text-muted hover:text-danger"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}

        {open.length === 0 && (
          <p className="text-[13.5px] text-muted">No codes waiting to be used.</p>
        )}

        {spent.length > 0 && (
          <p className="text-[12.5px] text-muted">
            {spent.length} code{spent.length === 1 ? "" : "s"} already used or revoked.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
