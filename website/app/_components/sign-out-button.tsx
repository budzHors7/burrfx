"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/app/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleSignOut() {
    if (isPending) {
      return;
    }

    setIsPending(true);
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/auth");
          router.refresh();
        },
      },
    });
    setIsPending(false);
  }

  return (
    <button
      className="inline-flex h-10 items-center gap-2 rounded-[6px] border border-white/14 px-4 text-sm font-black text-white/78 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isPending}
      onClick={handleSignOut}
      type="button"
    >
      <LogOut aria-hidden="true" size={17} strokeWidth={2.5} />
      {isPending ? "Signing out" : "Sign out"}
    </button>
  );
}
