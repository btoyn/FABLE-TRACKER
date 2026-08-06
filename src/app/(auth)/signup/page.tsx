import Link from "next/link";
import { Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getFlags } from "@/lib/flags";
import { SignupForm } from "./signup-form";

/**
 * Signups are closed by default — this is one person's private workspace, not a
 * product anyone with the URL should be able to join. Set
 * NEXT_PUBLIC_SIGNUPS_OPEN=true to reopen when onboarding someone.
 */
export default function SignupPage() {
  if (getFlags().signupsOpen) return <SignupForm />;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <span className="mb-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Lock className="h-[18px] w-[18px]" />
        </span>
        <CardTitle className="text-lg">Accounts are by invitation</CardTitle>
        <CardDescription>
          This workspace isn&apos;t open for sign-ups. If you should have access, ask Brandon to set
          up an account for you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link href="/login" className={buttonVariants({ variant: "secondary", size: "md" })}>
          Back to sign in
        </Link>
      </CardContent>
    </Card>
  );
}
