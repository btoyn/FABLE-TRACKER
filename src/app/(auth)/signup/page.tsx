import { getFlags } from "@/lib/flags";
import { SignupForm } from "./signup-form";

/**
 * Signups are closed to the public by default — this is a private workspace,
 * not a product anyone with the URL should be able to join. An invite code
 * lets a specific person in without opening the door to everyone; setting
 * NEXT_PUBLIC_SIGNUPS_OPEN=true removes the code requirement entirely.
 */
export default function SignupPage() {
  return <SignupForm requireInvite={!getFlags().signupsOpen} />;
}
