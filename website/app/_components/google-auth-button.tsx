"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { authClient } from "@/app/lib/auth-client";

export function GoogleAuthButton({
  disabled,
  label,
}: {
  disabled: boolean;
  label: string;
}) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    if (disabled || isPending) {
      return;
    }

    setError(null);
    setIsPending(true);

    await authClient.signIn.social(
      {
        callbackURL: "/dashboard",
        errorCallbackURL: "/auth?error=google_auth_failed",
        newUserCallbackURL: "/dashboard",
        provider: "google",
      },
      {
        onError: (ctx) => {
          setError(ctx.error.message ?? "Google sign-in could not start.");
          setIsPending(false);
        },
      },
    );
  }

  return (
    <div>
      <button
        className="flex h-14 w-full items-center justify-center gap-3 rounded-[6px] bg-white px-5 text-sm font-black text-black transition hover:bg-[#eef3f0] disabled:cursor-not-allowed disabled:bg-white/25 disabled:text-white/42"
        disabled={disabled || isPending}
        onClick={handleSignIn}
        type="button"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full border border-black/12 text-base font-black text-[#1f66ff]">
          G
        </span>
        {isPending ? "Opening Google..." : label}
        <ArrowRight aria-hidden="true" size={18} strokeWidth={3} />
      </button>
      {error ? (
        <p className="mt-3 text-sm font-bold leading-6 text-[#ffd28a]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
