import Link from "next/link";
import { ArrowRight, Download, ShieldCheck, Smartphone } from "lucide-react";

const androidAppUrl =
  process.env.NEXT_PUBLIC_ANDROID_APP_URL ??
  "https://play.google.com/store/search?q=BurrFx&c=apps";

const footerGroups = [
  {
    title: "Product",
    links: [
      ["Overview", "/#product"],
      ["Strategy", "/#strategy"],
      ["Latest", "/#latest"],
      ["Risk", "/#risk"],
      ["Deploy", "/#deploy"],
      ["Affiliates", "/#affiliates"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["Contact", "/about#contact"],
      ["Sign in", "/auth"],
      ["Register", "/register"],
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-[#070a09] px-5 py-12 text-white sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 border-b border-white/10 pb-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Link className="text-3xl font-black" href="/">
              Burr<span className="text-[#33e060]">Fx</span>
            </Link>
            <p className="mt-5 max-w-xl text-sm leading-6 text-white/62">
              A self-hosted MetaTrader 5 automation stack for traders who want
              strategy execution, risk guardrails, API control, and mobile
              visibility in one workflow.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[6px] bg-[#33e060] px-4 text-sm font-black text-black transition hover:bg-[#62ef82]"
                href="/auth"
              >
                Get BurrFx
                <ArrowRight aria-hidden="true" size={17} strokeWidth={3} />
              </Link>
              <a
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[6px] border border-white/14 px-4 text-sm font-black text-white/78 transition hover:bg-white/[0.06] hover:text-white"
                href={androidAppUrl}
                rel="noreferrer"
                target="_blank"
              >
                <Download aria-hidden="true" size={17} strokeWidth={3} />
                Android app
              </a>
            </div>
          </div>

          <div className="grid gap-7 sm:grid-cols-3">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <h2 className="text-sm font-black uppercase text-white">
                  {group.title}
                </h2>
                <nav className="mt-4 grid gap-3 text-sm font-bold text-white/58">
                  {group.links.map(([label, href]) => (
                    <Link className="transition hover:text-white" href={href} key={href}>
                      {label}
                    </Link>
                  ))}
                </nav>
              </div>
            ))}

            <div>
              <h2 className="text-sm font-black uppercase text-white">
                Mobile
              </h2>
              <div className="mt-4 grid gap-3">
                <div className="flex gap-3">
                  <Smartphone
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-[#33e060]"
                    size={20}
                    strokeWidth={2.5}
                  />
                  <p className="text-sm leading-6 text-white/58">
                    Android available now. iOS coming soon.
                  </p>
                </div>
                <div className="flex gap-3">
                  <ShieldCheck
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-[#1f66ff]"
                    size={20}
                    strokeWidth={2.5}
                  />
                  <p className="text-sm leading-6 text-white/58">
                    Built as a control surface, not a profit guarantee.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 pt-6 text-xs font-bold uppercase text-white/42 sm:grid-cols-[1fr_auto]">
          <p>© {new Date().getFullYear()} BurrFx. All rights reserved.</p>
          <p>Trading involves market, broker, liquidity, and automation risk.</p>
        </div>
      </div>
    </footer>
  );
}
