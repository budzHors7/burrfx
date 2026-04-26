import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/app/_components/auth-shell";
import { getSession } from "@/app/lib/auth";

export const metadata: Metadata = {
  title: "Sign In",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;
  const isGoogleConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );

  return (
    <AuthShell
      error={error}
      isGoogleConfigured={isGoogleConfigured}
      mode="login"
    />
  );
}
