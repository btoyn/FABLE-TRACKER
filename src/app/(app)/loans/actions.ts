"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";

/**
 * Active loans, kept deliberately thin (spec §26, "keep this lightweight").
 *
 * A loan record here exists for one reason: to know who is owed their weekly
 * update. It is not a pipeline. No amounts, no stages, no milestones — that
 * lives in the system that already tracks production, and a second half-kept
 * copy would only ever be the wrong one.
 */

const WEEK_MS = 7 * 86_400_000;

export async function createLoan(input: {
  borrowerName: string;
  lenderId: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const borrower = input.borrowerName.trim();
  if (!borrower) return { error: "Who's the borrower?" };
  if (!input.lenderId) return { error: "Pick the lender who sent it over." };

  const { data: lender } = await supabase
    .from("lenders")
    .select("id, institution_id")
    .eq("id", input.lenderId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!lender) return { error: "Lender not found." };

  // Due immediately: a loan you just started tracking is one you owe an update
  // on, not one that gets a week's grace.
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("active_loans")
    .insert({
      user_id: user.id,
      lender_id: lender.id,
      institution_id: lender.institution_id,
      borrower_name: borrower,
      updates_active: true,
      next_update_due_at: today,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Could not save the loan." };

  await logAudit(supabase, user.id, {
    entityType: "active_loan",
    entityId: data.id,
    action: "create",
    newValue: { borrowerName: borrower, lenderId: lender.id },
  });

  revalidatePath("/loans");
  revalidatePath("/dashboard");
  return {};
}

/** Stops the weekly clock. The record stays, so the history stays readable. */
export async function closeLoan(loanId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("active_loans")
    .update({ updates_active: false, next_update_due_at: null, updated_at: new Date().toISOString() })
    .eq("id", loanId);
  if (error) return { error: error.message };
  revalidatePath("/loans");
  revalidatePath("/dashboard");
  return {};
}

export async function reopenLoan(loanId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("active_loans")
    .update({
      updates_active: true,
      next_update_due_at: new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    })
    .eq("id", loanId);
  if (error) return { error: error.message };
  revalidatePath("/loans");
  revalidatePath("/dashboard");
  return {};
}

/** Removes a loan added by mistake. Soft — Trash holds it for 90 days. */
export async function deleteLoan(loanId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("active_loans")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", loanId);
  if (error) return { error: error.message };

  await logAudit(supabase, user.id, {
    entityType: "active_loan",
    entityId: loanId,
    action: "soft_delete",
    undoAvailable: true,
  });

  revalidatePath("/loans");
  revalidatePath("/dashboard");
  return {};
}

/**
 * Records that the referring lender was brought up to date.
 *
 * The note is optional but worth typing: it becomes the timeline entry, so in
 * six weeks "what did I last tell Marcus about the Cedar Ridge deal" has an
 * answer. It's also the raw material AI drafting would work from later.
 */
export async function logLoanUpdate(
  loanId: string,
  note?: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: loan } = await supabase
    .from("active_loans")
    .select("id, lender_id, institution_id, borrower_name")
    .eq("id", loanId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!loan) return { error: "That loan is no longer being tracked." };

  const now = new Date();
  const nextDue = new Date(now.getTime() + WEEK_MS).toISOString().slice(0, 10);

  const { error } = await supabase
    .from("active_loans")
    .update({
      last_update_sent_at: now.toISOString(),
      next_update_due_at: nextDue,
      updated_at: now.toISOString(),
    })
    .eq("id", loanId);
  if (error) return { error: error.message };

  // Keeping a referral partner informed is a real touch, so it lands on their
  // timeline and resets their coverage clock too (§9).
  if (loan.lender_id) {
    await supabase.from("activities").insert({
      user_id: user.id,
      lender_id: loan.lender_id,
      institution_id: loan.institution_id,
      active_loan_id: loan.id,
      activity_type: "loan_update",
      direction: "outbound",
      occurred_at: now.toISOString(),
      subject: `Weekly update — ${loan.borrower_name}`,
      summary: note?.trim() || null,
      personal_touch: true,
      counts_for_coverage: true,
      source: "manual",
    });
  }

  revalidatePath("/loans");
  revalidatePath("/dashboard");
  revalidatePath("/follow-ups");
  return {};
}
