/**
 * The weekly-update cadence (spec §26).
 *
 * Lives on its own because the dashboard card and the Loans page both need it,
 * and an off-by-one here is the difference between a referral partner hearing
 * from you and not.
 */

export type LoanState = "updated" | "due" | "overdue" | "closed";

/**
 * A loan is *due* the day its date comes up and stays merely due for a week —
 * a day or two late is ordinary. Past that it's overdue, which is the point at
 * which silence starts to read as neglect.
 */
export function loanState(daysLate: number, active: boolean): LoanState {
  if (!active) return "closed";
  if (daysLate < 0) return "updated";
  return daysLate > 7 ? "overdue" : "due";
}

/** Whole days between a due date and today; negative while it's still ahead. */
export function daysLateFrom(dueDate: Date, today: Date): number {
  return Math.floor((today.getTime() - dueDate.getTime()) / 86_400_000);
}
