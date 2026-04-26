import Image from "next/image";
import Link from "next/link";
import { ChevronDown, LayoutDashboard, LogOut } from "lucide-react";

export type HeaderUser = {
  email?: string | null;
  image?: string | null;
  name: string;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AccountMenu({ user }: { user: HeaderUser }) {
  const initials = getInitials(user.name) || "BF";

  return (
    <details className="group relative z-[80] shrink-0">
      <summary
        aria-label={`Open account menu for ${user.name}`}
        className="inline-flex h-11 max-w-[calc(100vw-8rem)] cursor-pointer list-none items-center gap-2 rounded-[6px] border border-white/14 bg-white/[0.04] px-2 pr-3 text-sm font-black text-white transition marker:content-[''] hover:border-white/28 hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-[#33e060] focus:ring-offset-2 focus:ring-offset-[#070a09] sm:max-w-[260px] [&::-webkit-details-marker]:hidden"
      >
        <span className="relative grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-[#33e060] text-xs font-black text-black">
          <span aria-hidden="true">{initials}</span>
          {user.image ? (
            <Image
              alt=""
              fill
              className="absolute inset-0 h-full w-full object-cover"
              referrerPolicy="no-referrer"
              sizes="32px"
              src={user.image}
              unoptimized
            />
          ) : null}
        </span>
        <span className="min-w-0 truncate">{user.name}</span>
        <ChevronDown
          aria-hidden="true"
          className="shrink-0 transition group-open:rotate-180"
          size={16}
          strokeWidth={3}
        />
      </summary>

      <div
        className="absolute right-0 top-[calc(100%+10px)] z-[90] w-[calc(100vw-2.5rem)] max-w-72 rounded-[8px] border border-white/12 bg-[#101514] p-2 text-white shadow-[0_24px_70px_rgba(0,0,0,0.34)] sm:w-72"
        id="site-account-menu"
        role="menu"
      >
        <div className="border-b border-white/10 px-3 py-3">
          <p className="truncate text-sm font-black">{user.name}</p>
          {user.email ? (
            <p className="mt-1 truncate text-xs font-bold text-white/50">
              {user.email}
            </p>
          ) : null}
        </div>

        <Link
          className="mt-2 flex h-11 items-center gap-3 rounded-[6px] px-3 text-sm font-black text-white/78 transition hover:bg-white/[0.07] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#33e060]"
          href="/dashboard"
          role="menuitem"
        >
          <LayoutDashboard
            aria-hidden="true"
            className="text-[#33e060]"
            size={18}
            strokeWidth={2.5}
          />
          Dashboard
        </Link>

        <Link
          className="flex h-11 items-center gap-3 rounded-[6px] px-3 text-sm font-black text-white/78 transition hover:bg-white/[0.07] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#33e060]"
          href="/api/auth/logout"
          role="menuitem"
        >
          <LogOut
            aria-hidden="true"
            className="text-[#f2a51a]"
            size={18}
            strokeWidth={2.5}
          />
          Logout
        </Link>
      </div>
    </details>
  );
}
