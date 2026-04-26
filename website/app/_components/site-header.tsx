import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AccountMenu } from "@/app/_components/account-menu";
import { getSession, type BurrFxSession } from "@/app/lib/auth";

type SiteHeaderProps = {
  active?: "about" | "dashboard" | "home";
  session?: BurrFxSession | null;
};

const navItems = [
  { href: "#product", label: "Product" },
  { href: "#strategy", label: "Strategy" },
  { href: "#risk", label: "Risk" },
  { href: "#deploy", label: "Deploy" },
];

async function readHeaderSession() {
  try {
    return await getSession();
  } catch {
    return null;
  }
}

export async function SiteHeader({
  active = "home",
  session: providedSession,
}: SiteHeaderProps) {
  const session =
    providedSession === undefined ? await readHeaderSession() : providedSession;
  const user = session?.user;
  const hashPrefix = active === "home" ? "" : "/";

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070a09]/94 text-white shadow-[0_18px_50px_rgba(0,0,0,0.24)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
        <Link
          aria-label="BurrFx home"
          className="shrink-0 text-3xl font-black"
          href="/"
        >
          Burr<span className="text-[#33e060]">Fx</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-bold text-white/78 md:flex">
          {navItems.map((item) => (
            <Link
              className="hover:text-white"
              href={`${hashPrefix}${item.href}`}
              key={item.label}
            >
              {item.label}
            </Link>
          ))}
          <Link
            className={active === "about" ? "text-white" : "hover:text-white"}
            href="/about"
          >
            About
          </Link>
        </nav>

        {user ? (
          <AccountMenu
            user={{
              email: user.email,
              image: user.image,
              name: user.name ?? "BurrFx Trader",
            }}
          />
        ) : (
          <Link
            className="hidden h-11 cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-[#33e060] px-5 text-sm font-black text-black transition hover:bg-[#62ef82] focus:outline-none focus:ring-2 focus:ring-[#33e060] focus:ring-offset-2 focus:ring-offset-[#070a09] sm:inline-flex"
            href="/auth"
          >
            Get BurrFx
            <ArrowRight aria-hidden="true" size={16} strokeWidth={3} />
          </Link>
        )}
      </div>
    </header>
  );
}
