"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select, Textarea, FieldHint } from "@/components/ui/input";
import { TERRITORIES } from "@/lib/labels";
import {
  createLender,
  type CreateLenderInput,
  type DuplicateCandidate,
} from "../actions";

export function AddLenderForm({ institutionNames }: { institutionNames: string[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[] | null>(null);
  const [pendingInput, setPendingInput] = useState<CreateLenderInput | null>(null);
  const [followUp, setFollowUp] = useState<CreateLenderInput["followUp"]>("in_30_days");

  function submit(input: CreateLenderInput) {
    setError(null);
    startTransition(async () => {
      const result = await createLender(input);
      // On success the action redirects; a return value means something to show.
      if (result?.status === "duplicates") {
        setDuplicates(result.candidates);
        setPendingInput(input);
      } else if (result?.status === "error") {
        setError(result.message);
      }
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    submit({
      firstName: String(f.get("firstName") ?? ""),
      lastName: String(f.get("lastName") ?? ""),
      institutionName: String(f.get("institutionName") ?? ""),
      email: String(f.get("email") ?? ""),
      mobilePhone: String(f.get("mobilePhone") ?? ""),
      city: String(f.get("city") ?? ""),
      territory: String(f.get("territory") ?? ""),
      title: String(f.get("title") ?? ""),
      notes: String(f.get("notes") ?? ""),
      interests: String(f.get("interests") ?? ""),
      followUp,
      followUpDate: String(f.get("followUpDate") ?? ""),
    });
  }

  if (duplicates) {
    return (
      <Card>
        <CardContent className="space-y-4 pt-5">
          <div>
            <h2 className="font-semibold">This might already be in your list</h2>
            <p className="text-sm text-muted">
              Check these existing lenders before creating a new record:
            </p>
          </div>
          <ul className="space-y-2">
            {duplicates.map((d) => (
              <li key={d.id} className="rounded-lg border border-border p-3 text-sm">
                <Link href={`/lenders/${d.id}`} className="font-medium text-primary hover:underline">
                  {d.full_name}
                </Link>
                <p className="text-muted">
                  {[d.institution_name, d.email].filter(Boolean).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setDuplicates(null);
                setPendingInput(null);
              }}
            >
              Go back and edit
            </Button>
            <Button
              disabled={pending}
              onClick={() => pendingInput && submit({ ...pendingInput, ignoreDuplicates: true })}
            >
              {pending ? "Creating…" : "Create anyway"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName">First name *</Label>
              <Input id="firstName" name="firstName" required autoFocus />
            </div>
            <div>
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" name="lastName" />
            </div>
          </div>

          <div>
            <Label htmlFor="institutionName">Institution *</Label>
            <Input
              id="institutionName"
              name="institutionName"
              required
              list="institution-options"
              placeholder="Bank or credit union name"
            />
            <datalist id="institution-options">
              {institutionNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <FieldHint>New institutions are created automatically.</FieldHint>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div>
              <Label htmlFor="mobilePhone">Mobile phone</Label>
              <Input id="mobilePhone" name="mobilePhone" type="tel" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" />
            </div>
            <div>
              <Label htmlFor="territory">Territory</Label>
              <Select id="territory" name="territory" defaultValue="">
                <option value="">Not sure yet</option>
                {TERRITORIES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" placeholder="e.g. Commercial Lender" />
          </div>

          <div>
            <Label htmlFor="interests">Interests</Label>
            <Input id="interests" name="interests" placeholder="e.g. golf, BYU football" />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>

          <div>
            <Label htmlFor="followUpSelect">When should I remind you to follow up?</Label>
            <Select
              id="followUpSelect"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value as CreateLenderInput["followUp"])}
            >
              <option value="next_week">Next week</option>
              <option value="in_30_days">In 30 days</option>
              <option value="before_next_trip">Before my next territory trip</option>
              <option value="custom">Pick a date</option>
              <option value="skip">Skip (defaults to 30 days)</option>
            </Select>
            {followUp === "custom" && (
              <div className="mt-2">
                <Input name="followUpDate" type="date" required />
              </div>
            )}
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving…" : "Save lender"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
