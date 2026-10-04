"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const MESSAGES: Record<string, string> = {
  google: "Google sign-in failed. Please try again.",
  "google-email":
    "Your Google account did not share an email address, which is required to sign in.",
  "google-email-unverified":
    "Google has not verified that email address, so it cannot be used to sign in. Verify it with Google or sign up with email instead.",
  twitter: "Twitter sign-in failed. Please try again.",
  "twitter-email":
    "Your Twitter account did not share an email address, which is required to sign in. You may need to grant email access to ejuicr in your Twitter settings.",
};

export default function AuthErrorNotice() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  const error = searchParams.get("authError");
  if (!error || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("authError");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-4 bg-brand-red px-4 py-3 text-ink"
    >
      <p className="m-0">{MESSAGES[error] ?? "Sign-in failed. Please try again."}</p>
      <button
        type="button"
        onClick={dismiss}
        className="border border-ink/40 bg-transparent px-2 py-1 text-ink hover:bg-ink/10 active:bg-ink/20"
      >
        Dismiss
      </button>
    </div>
  );
}
