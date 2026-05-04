import Link from "next/link";
import { ArrowRight, Bot, ShieldCheck } from "lucide-react";

const errorMessages: Record<string, string> = {
  google_auth_failed:
    "Google sign-in could not complete. Check the Better Auth and Google OAuth configuration.",
  google_email_unverified:
    "Google did not confirm that email address as verified.",
  google_profile_failed: "Google sign-in worked, but profile loading failed.",
  google_token_failed: "Google could not complete the sign-in exchange.",
  invalid_google_state: "That Google sign-in session expired. Try again.",
  missing_google_config:
    "Google auth is not configured yet. Add the Google OAuth environment variables.",
};

export function AuthShell({
  error,
  isGoogleConfigured,
  mode,
}: {
  error?: string | string[];
  isGoogleConfigured: boolean;
  mode: "login" | "register";
}) {
  const errorKey = Array.isArray(error) ? error[0] : error;
  const isRegister = mode === "register";

  return (
    <main className="market-grid min-h-screen bg-[#070a09] px-5 py-6 text-white sm:px-8 lg:px-10">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <Link className="text-3xl font-black" href="/">
          Burr<span className="text-[#33e060]">Fx</span>
        </Link>
        <Link
          className="rounded-[6px] border border-white/14 px-4 py-2 text-sm font-black text-white/78 transition hover:bg-white/[0.06] hover:text-white"
          href={isRegister ? "/login" : "/register"}
        >
          {isRegister ? "Sign in" : "Register"}
        </Link>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-92px)] max-w-6xl items-center gap-8 py-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="mb-5 inline-flex w-fit items-center gap-2 rounded-[6px] border border-white/12 bg-white/[0.04] px-3 py-2 text-xs font-black uppercase text-white/72">
            <ShieldCheck
              aria-hidden="true"
              className="text-[#33e060]"
              size={15}
            />
            Google auth only
          </p>
          <h1 className="max-w-3xl text-5xl font-black leading-[0.92] sm:text-7xl">
            {isRegister ? "Create your BurrFx account." : "Sign in to BurrFx."}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white/68">
            {isRegister
              ? "Use a Google account to register. Android access is available now, with iOS coming soon."
              : "Use Google to enter the BurrFx dashboard and keep the trading control surface locked to a verified identity."}
          </p>
        </div>

        <div className="rounded-[8px] border border-white/12 bg-white/[0.05] p-5 shadow-[0_34px_90px_rgba(0,0,0,0.36)] sm:p-7">
          <div className="mb-8 flex items-center gap-3">
            <Bot aria-hidden="true" className="text-[#33e060]" size={32} />
            <div>
              <h2 className="text-2xl font-black">
                {isRegister ? "Register with Google" : "Continue with Google"}
              </h2>
              <p className="mt-1 text-sm text-white/54">
                Password sign-in is intentionally disabled.
              </p>
            </div>
          </div>

          {errorKey ? (
            <p className="mb-4 rounded-[6px] border border-[#f2a51a]/35 bg-[#f2a51a]/10 p-3 text-sm font-bold leading-6 text-[#ffd28a]">
              {errorMessages[errorKey] ?? "Google sign-in could not complete."}
            </p>
          ) : null}

          {!isGoogleConfigured ? (
            <p className="mb-4 rounded-[6px] border border-white/12 bg-white/[0.05] p-3 text-sm font-bold leading-6 text-white/62">
              Google OAuth needs `GOOGLE_CLIENT_ID` and
              `GOOGLE_CLIENT_SECRET`. The dashboard is still available with mock
              user data while those credentials are added.
            </p>
          ) : null}

          {isGoogleConfigured ? (
            <Link
              className="flex h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-[6px] bg-white px-5 text-sm font-black text-black transition hover:bg-[#eef3f0]"
              href="/api/auth/google"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full border border-black/12 text-base font-black text-[#1f66ff]">
                G
              </span>
              {isRegister ? "Register with Google" : "Sign in with Google"}
              <ArrowRight aria-hidden="true" size={18} strokeWidth={3} />
            </Link>
          ) : (
            <button
              className="flex h-14 w-full cursor-not-allowed items-center justify-center gap-3 rounded-[6px] bg-white/25 px-5 text-sm font-black text-white/42"
              disabled
              type="button"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full border border-white/12 text-base font-black text-white/42">
                G
              </span>
              {isRegister ? "Register with Google" : "Sign in with Google"}
              <ArrowRight aria-hidden="true" size={18} strokeWidth={3} />
            </button>
          )}

          <p className="mt-5 text-sm leading-6 text-white/54">
            After Google confirms the account, BurrFx redirects straight to the
            dashboard.
          </p>
        </div>
      </section>
    </main>
  );
}
