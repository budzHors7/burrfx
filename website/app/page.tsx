import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/app/_components/site-header";
import { SiteFooter } from "@/app/_components/site-footer";
import {
  Activity,
  ArrowRight,
  Bot,
  Braces,
  CandlestickChart,
  Check,
  CircleDollarSign,
  Download,
  Gauge,
  LineChart,
  LockKeyhole,
  MonitorPlay,
  Play,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  TerminalSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Feature = {
  title: string;
  body: string;
  icon: LucideIcon;
};

type DeployFeature = Feature & {
  cta?: {
    href: string;
    label: string;
  };
};

const proofPoints: Feature[] = [
  {
    title: "Risk first",
    body: "Guardrails before every trade",
    icon: ShieldCheck,
  },
  {
    title: "Self hosted",
    body: "Your server. Your rules.",
    icon: Server,
  },
  {
    title: "Mobile visibility",
    body: "Real-time control in your pocket",
    icon: Smartphone,
  },
];

const flowSteps = [
  {
    label: "01",
    title: "Data feed",
    body: "Pull live candles, spreads, account state, and high-impact news context from the trading machine.",
    meta: "MT5 / FX / indices",
    icon: CandlestickChart,
  },
  {
    label: "02",
    title: "Strategy engine",
    body: "Evaluate MA crossovers, trendline price action, SMC liquidity sweeps, stochastic crosses, and news signals per timeframe.",
    meta: "Python runtime",
    icon: Bot,
  },
  {
    label: "03",
    title: "Risk guardrails",
    body: "Apply profile rules, spread checks, rollover protection, position caps, break-even, and trailing stops.",
    meta: "Rules always on",
    icon: ShieldCheck,
  },
  {
    label: "04",
    title: "MT5 execution",
    body: "Route confirmed orders through the local MetaTrader 5 bridge while keeping the terminal workflow intact.",
    meta: "Windows first",
    icon: TerminalSquare,
  },
  {
    label: "05",
    title: "Mobile dashboard",
    body: "Monitor open trades, logs, account health, bot state, and journal progress from the mobile companion app.",
    meta: "Android now",
    icon: Smartphone,
  },
];

const strategyCards: Feature[] = [
  {
    title: "Multi-signal engine",
    body: "Run trendline, MA, SMC, high-impact news, and broker-scoped stochastic logic from one strategy catalog.",
    icon: LineChart,
  },
  {
    title: "Profile driven risk",
    body: "Switch between Smart Risk, Regular Risk, and Highly Risky profiles without rewriting code.",
    icon: SlidersHorizontal,
  },
  {
    title: "API bridge included",
    body: "Expose bot status, account logs, open trades, start, and stop controls through FastAPI.",
    icon: Braces,
  },
  {
    title: "Trading state you can audit",
    body: "Keep the terminal, server, and mobile app aligned around one MT5 session and shared settings.",
    icon: Activity,
  },
];

const riskRows = [
  "Spread and session filters",
  "Daily lock, target, and loss limits",
  "Closed-trade P/L with commission, swap, and fee accounting",
  "ATR-based stop, break-even, and trailing logic",
  "Position caps per symbol",
];

const latestChanges: Feature[] = [
  {
    title: "Desktop settings",
    body: "Control trading profiles, global strategies, active brokers, and broker-specific strategy toggles from the BurrFx desktop app.",
    icon: SlidersHorizontal,
  },
  {
    title: "Deriv strategy mode",
    body: "Deriv can now run a dedicated Stochastic Oscillator setup for Boom 1000 and Crash 1000 Index symbols.",
    icon: CandlestickChart,
  },
  {
    title: "Cleaner risk accounting",
    body: "Daily P/L now focuses on trade deals and includes profit, commission, swap, and fee values before risk locks respond.",
    icon: ShieldCheck,
  },
];

const androidAppUrl =
  process.env.NEXT_PUBLIC_ANDROID_APP_URL ??
  "https://play.google.com/store/search?q=BurrFx&c=apps";

const deployItems: DeployFeature[] = [
  {
    title: "Windows MT5 host",
    body: "Run the trading process where MetaTrader 5 can maintain its local terminal session.",
    icon: TerminalSquare,
  },
  {
    title: "FastAPI control layer",
    body: "Serve health checks, auth session state, account logs, open trades, bot controls, and saveable settings.",
    icon: Server,
  },
  {
    title: "Broker-aware settings",
    body: "Switch Exness and Deriv availability, restore strategy defaults, and keep Deriv scoped to its allowed stochastic setup.",
    icon: SlidersHorizontal,
  },
  {
    title: "Mobile companion app",
    body: "Android is available now, with iOS coming soon. Connect the app to the API using your reachable server URL.",
    icon: Smartphone,
    cta: {
      href: androidAppUrl,
      label: "Download Android app",
    },
  },
];

const affiliatePartners = [
  {
    title: "Exness",
    body: "Placeholder area for the Exness affiliate offer, onboarding copy, account setup notes, and campaign link.",
    placeholder: "Exness affiliate link placeholder",
    logo: {
      alt: "Exness logo",
      className: "h-6 w-36",
      height: 24,
      src: "/broker-exness.svg",
      width: 144,
    },
    logoSurface:
      "border border-black/10 bg-white text-[#141d22] shadow-[0_10px_28px_rgba(8,11,10,0.06)]",
  },
  {
    title: "Deriv",
    body: "Placeholder area for the Deriv affiliate offer, synthetic indices setup notes, and campaign link.",
    placeholder: "Deriv affiliate link placeholder",
    logo: {
      alt: "Deriv logo",
      className: "h-6 w-[73px]",
      height: 24,
      src: "/broker-deriv.svg",
      width: 73,
    },
    logoSurface:
      "border border-[#ff444f]/30 bg-[#ff444f] shadow-[0_10px_28px_rgba(255,68,79,0.24)]",
  },
];

const productVideos = [
  {
    title: "Product showcase",
    body: "A wide product reel for the landing page, demos, and launch posts. It walks through scan, signal, risk, and control in one concise Remotion render.",
    src: "/burrfx-product-showcase.mp4",
    poster: "/burrfx-product-showcase-poster.png",
    label: "Landscape MP4",
    icon: MonitorPlay,
  },
  {
    title: "Mobile control reel",
    body: "A vertical show video for Shorts, Reels, and mobile-first socials. It shows the companion app moving from ready state to running bot visibility.",
    src: "/burrfx-mobile-control.mp4",
    poster: "/burrfx-mobile-control-poster.png",
    label: "Vertical MP4",
    icon: Smartphone,
  },
];

function ActionLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const classes =
    variant === "primary"
      ? "border-[#33e060] bg-[#33e060] text-black shadow-[0_18px_48px_rgba(51,224,96,0.24)] hover:bg-[#62ef82]"
      : "border-white/20 bg-white/[0.04] text-white hover:border-white/40 hover:bg-white/[0.08]";

  return (
    <Link
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-[6px] border px-5 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-[#33e060] focus:ring-offset-2 focus:ring-offset-[#070a09] ${classes}`}
      href={href}
    >
      {children}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-xs font-black uppercase text-[#1f66ff]">
      {children}
    </p>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f4f1e8] text-[#080b0a]">
      <SiteHeader active="home" />

      <section className="market-grid overflow-hidden bg-[#070a09] text-white">
        <div
          id="top"
          className="mx-auto grid w-full max-w-7xl gap-9 px-5 pb-9 pt-5 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:px-10 lg:pb-16 lg:pt-10"
        >
          <div className="flex flex-col justify-center">
            <p className="mb-5 inline-flex w-fit items-center gap-2 rounded-[6px] border border-white/12 bg-white/[0.04] px-3 py-2 text-xs font-black uppercase text-white/72">
              <Gauge aria-hidden="true" size={15} className="text-[#33e060]" />
              MetaTrader 5 automation
            </p>
            <h1 className="max-w-4xl text-5xl font-black leading-[0.92] text-white sm:text-7xl lg:text-8xl">
              Turn MT5 signals into{" "}
              <span className="text-[#33e060]">controlled</span> execution.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/74 sm:text-xl">
              BurrFx connects market data, strategy logic, and risk rules into
              a self-hosted automation system for MetaTrader 5. You stay in
              control before the bot ever touches an order.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ActionLink href="/auth">
                Get BurrFx
                <ArrowRight aria-hidden="true" size={18} strokeWidth={3} />
              </ActionLink>
              <ActionLink href="#product" variant="secondary">
                See it in action
                <Play aria-hidden="true" size={17} strokeWidth={3} />
              </ActionLink>
            </div>

            <div className="mt-8 hidden gap-3 lg:grid lg:grid-cols-3">
              {proofPoints.map((item) => (
                <div key={item.title} className="flex gap-3">
                  <item.icon
                    aria-hidden="true"
                    className="mt-1 shrink-0 text-[#33e060]"
                    size={26}
                    strokeWidth={2.5}
                  />
                  <div>
                    <p className="text-xs font-black uppercase text-white">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-white/65">
                      {item.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative hidden min-h-[330px] items-center lg:flex lg:min-h-[560px]">
            <div className="hero-chart absolute inset-x-0 top-6 h-40 opacity-75" />
            <div className="relative ml-auto w-full max-w-[620px]">
              <div className="dashboard-shell rotate-0 border border-white/12 bg-[#101514] p-4 shadow-2xl lg:-rotate-3">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-[#33e060]">BurrFx</p>
                    <p className="text-[11px] font-bold uppercase text-white/45">
                      MT5 command center
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#33e060]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#f2a51a]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#1f66ff]" />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-[0.7fr_1.3fr]">
                  <div className="grid gap-3">
                    {["Smart Risk", "Regular Risk", "Highly Risky"].map(
                      (item, index) => (
                        <div
                          key={item}
                          className="rounded-[6px] border border-white/10 bg-white/[0.04] p-3"
                        >
                          <p className="text-[11px] font-black uppercase text-white/48">
                            Profile {index + 1}
                          </p>
                          <p className="mt-1 text-sm font-black text-white">
                            {item}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                  <div className="rounded-[8px] border border-white/10 bg-black/35 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-white/54">
                        Strategy cycle
                      </span>
                      <span className="rounded-[6px] bg-[#33e060] px-2 py-1 text-[11px] font-black text-black">
                        Running
                      </span>
                    </div>
                    <svg
                      aria-hidden="true"
                      className="h-40 w-full"
                      viewBox="0 0 420 190"
                    >
                      <defs>
                        <linearGradient id="lineFill" x1="0" x2="1">
                          <stop offset="0%" stopColor="#33e060" />
                          <stop offset="100%" stopColor="#1f66ff" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M10 148 L60 124 L98 136 L140 92 L184 104 L232 62 L276 74 L324 38 L392 24"
                        fill="none"
                        stroke="url(#lineFill)"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="6"
                      />
                      {[54, 98, 140, 232, 324].map((x, index) => (
                        <circle
                          key={x}
                          cx={x}
                          cy={[127, 136, 92, 62, 38][index]}
                          fill="#070a09"
                          r="8"
                          stroke="#33e060"
                          strokeWidth="4"
                        />
                      ))}
                      <g fill="#ffffff66" fontSize="12" fontWeight="800">
                        <text x="10" y="178">
                          M15
                        </text>
                        <text x="180" y="178">
                          H1
                        </text>
                        <text x="350" y="178">
                          D1
                        </text>
                      </g>
                    </svg>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-black uppercase text-white/68">
                      <span>Signal</span>
                      <span>Guard</span>
                      <span>Execute</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="phone-shell absolute -bottom-8 right-0 hidden w-36 border border-white/14 bg-[#111615] p-3 shadow-2xl sm:block">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-black text-white">BurrFx</span>
                  <span className="h-2 w-2 rounded-full bg-[#33e060]" />
                </div>
                {[
                  ["Equity", "12,842.75"],
                  ["Daily P/L", "+172.43"],
                  ["Open", "3"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="mb-2 rounded-[6px] border border-white/10 bg-white/[0.04] p-2"
                  >
                    <p className="text-[10px] font-bold text-white/44">
                      {label}
                    </p>
                    <p className="text-sm font-black text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="product"
        className="border-y border-black/10 bg-[#f4f1e8] px-5 py-14 sm:px-8 lg:px-10"
      >
        <div className="mx-auto max-w-7xl">
          <div>
            <SectionLabel>From market data to execution</SectionLabel>
            <h2 className="max-w-3xl text-4xl font-black leading-none sm:text-6xl">
              One loop. Every trade checked.
            </h2>
          </div>

          <div className="mt-10 overflow-hidden rounded-[8px] border border-black/12 bg-[#070a09] shadow-[0_24px_80px_rgba(8,11,10,0.18)]">
            <div className="grid gap-4 border-b border-white/10 bg-[#101514] p-5 sm:grid-cols-[auto_1fr] sm:items-center">
              <p className="text-sm font-black uppercase text-[#33e060]">
                Remotion explainer
              </p>
              <p className="max-w-4xl text-base leading-7 text-white/68 sm:justify-self-end sm:text-right">
                The rendered flow shows BurrFx feeding the bot, scoring the
                setup, applying risk, placing the order, then showing state in
                the mobile companion app.
              </p>
            </div>
            <Image
              src="/burrfx-bot-flow.gif"
              alt="Animated BurrFx flow from market data through strategy, risk, MT5 execution, and mobile monitoring"
              width={960}
              height={540}
              unoptimized
              className="aspect-video w-full object-cover p-2"
              priority
            />
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-5">
            {flowSteps.map((step) => (
              <div
                className="rounded-[8px] border border-black/12 bg-white p-4 shadow-[0_10px_32px_rgba(8,11,10,0.06)]"
                key={step.title}
              >
                <div className="mb-8 flex items-center justify-between">
                  <span className="text-xl font-black text-[#1f66ff]">
                    {step.label}
                  </span>
                  <step.icon
                    aria-hidden="true"
                    className="text-[#33b957]"
                    size={30}
                    strokeWidth={2.5}
                  />
                </div>
                <h3 className="text-base font-black uppercase">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-black/62">
                  {step.body}
                </p>
                <p className="mt-5 inline-flex rounded-[6px] bg-black/[0.06] px-2 py-1 text-xs font-bold text-black/68">
                  {step.meta}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-14 border-t border-black/10 pt-12">
            <div className="grid gap-8 lg:grid-cols-[0.68fr_1.32fr] lg:items-end">
              <div>
                <SectionLabel>Product show videos</SectionLabel>
                <h2 className="text-3xl font-black leading-none sm:text-5xl">
                  Social-ready Remotion reels for the bot.
                </h2>
              </div>
              <p className="max-w-2xl text-lg leading-8 text-black/64">
                The product videos are rendered assets, not placeholders. Use
                them in launch posts, product walkthroughs, or as hero media
                when the GIF is too short.
              </p>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              {productVideos.map((video) => (
                <article
                  className="overflow-hidden rounded-[8px] border border-black/12 bg-white shadow-[0_14px_44px_rgba(8,11,10,0.08)]"
                  key={video.title}
                >
                  <div className="bg-[#070a09] p-2">
                    <video
                      className={`w-full rounded-[6px] bg-black object-cover ${
                        video.label === "Vertical MP4"
                          ? "mx-auto aspect-[9/16] max-h-[680px]"
                          : "aspect-video"
                      }`}
                      controls
                      loop
                      muted
                      playsInline
                      preload="metadata"
                      poster={video.poster}
                    >
                      <source src={video.src} type="video/mp4" />
                    </video>
                  </div>
                  <div className="grid gap-4 p-5 sm:grid-cols-[auto_1fr]">
                    <video.icon
                      aria-hidden="true"
                      className="text-[#1f66ff]"
                      size={32}
                      strokeWidth={2.5}
                    />
                    <div>
                      <p className="mb-2 inline-flex rounded-[6px] bg-black/[0.06] px-2 py-1 text-xs font-black uppercase text-black/64">
                        {video.label}
                      </p>
                      <h3 className="text-2xl font-black">{video.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-black/62">
                        {video.body}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="strategy"
        className="bg-white px-5 py-16 sm:px-8 lg:px-10"
      >
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.88fr_1.12fr]">
          <div>
            <SectionLabel>Strategy stack</SectionLabel>
            <h2 className="text-4xl font-black leading-none sm:text-6xl">
              Built for traders who want the machine to follow the rules.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {strategyCards.map((item) => (
              <div
                className="rounded-[8px] border border-black/10 bg-[#f4f1e8] p-5"
                key={item.title}
              >
                <item.icon
                  aria-hidden="true"
                  className="mb-7 text-[#1f66ff]"
                  size={34}
                  strokeWidth={2.4}
                />
                <h3 className="text-xl font-black">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-black/62">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="latest"
        className="bg-white px-5 py-16 sm:px-8 lg:px-10"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div>
              <SectionLabel>Latest changes</SectionLabel>
              <h2 className="text-4xl font-black leading-none sm:text-6xl">
                Sharper desktop, broker, and risk controls.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-black/64">
              The newest BurrFx work focuses on configurable bot settings,
              broker-specific strategy behavior, and daily risk numbers that
              better match the account history that matters.
            </p>
          </div>

          <div className="mt-9 grid gap-4 md:grid-cols-3">
            {latestChanges.map((item) => (
              <article
                className="rounded-[8px] border border-black/10 bg-[#f4f1e8] p-5"
                key={item.title}
              >
                <item.icon
                  aria-hidden="true"
                  className="mb-8 text-[#1f66ff]"
                  size={34}
                  strokeWidth={2.4}
                />
                <h3 className="text-xl font-black">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-black/62">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="risk"
        className="bg-[#080b0a] px-5 py-16 text-white sm:px-8 lg:px-10"
      >
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <SectionLabel>Risk by design</SectionLabel>
            <h2 className="max-w-4xl text-4xl font-black leading-none sm:text-6xl">
              The sharp part is not the entry. It is everything around it.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/68">
              BurrFx does not market certainty. It gives your strategy a
              structured place to run, with checks that can say no before
              execution.
            </p>
          </div>
          <div className="rounded-[8px] border border-white/12 bg-white/[0.04] p-5">
            <div className="mb-5 flex items-center gap-3">
              <LockKeyhole
                aria-hidden="true"
                className="text-[#33e060]"
                size={30}
                strokeWidth={2.5}
              />
              <h3 className="text-2xl font-black">Guardrail checklist</h3>
            </div>
            <div className="grid gap-3">
              {riskRows.map((row) => (
                <div
                  className="flex items-center gap-3 rounded-[6px] border border-white/10 bg-black/24 p-3"
                  key={row}
                >
                  <Check
                    aria-hidden="true"
                    className="shrink-0 text-[#33e060]"
                    size={19}
                    strokeWidth={3}
                  />
                  <span className="text-sm font-bold text-white/76">{row}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="deploy"
        className="bg-[#f4f1e8] px-5 py-16 sm:px-8 lg:px-10"
      >
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[8px] border border-black/12 bg-[#080b0a] p-6 text-white shadow-[0_24px_80px_rgba(8,11,10,0.2)] sm:p-8 lg:p-10">
            <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
              <div>
                <TerminalSquare
                  aria-hidden="true"
                  className="mb-8 text-[#33e060]"
                  size={48}
                  strokeWidth={2.4}
                />
                <h2 className="text-4xl font-black leading-none sm:text-6xl">
                  Automate with confidence.{" "}
                  <span className="text-[#33e060]">Stay in control.</span>
                </h2>
                <p className="mt-6 max-w-xl text-lg leading-8 text-white/68">
                  Deploy BurrFx as a Windows-first MT5 automation stack: Python
                  engine, FastAPI controls, and a mobile dashboard connected to
                  the same trading state.
                </p>
                <div className="mt-8">
                  <ActionLink href="/register">
                    Start the build
                    <ArrowRight aria-hidden="true" size={18} strokeWidth={3} />
                  </ActionLink>
                </div>
              </div>
              <div className="grid gap-4">
                {deployItems.map((item) => (
                  <div
                    className="grid grid-cols-[auto_1fr] gap-4 rounded-[8px] border border-white/10 bg-white/[0.04] p-4"
                    key={item.title}
                  >
                    <item.icon
                      aria-hidden="true"
                      className="mt-1 text-[#f2a51a]"
                      size={28}
                      strokeWidth={2.4}
                    />
                    <div>
                      <h3 className="text-lg font-black">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-white/62">
                        {item.body}
                      </p>
                      {item.cta ? (
                        <a
                          className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-[6px] border border-[#33e060]/70 bg-[#33e060] px-4 text-sm font-black text-black transition hover:bg-[#62ef82]"
                          href={item.cta.href}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <Download
                            aria-hidden="true"
                            size={17}
                            strokeWidth={3}
                          />
                          {item.cta.label}
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 grid gap-4 border-t border-white/10 pt-6 sm:grid-cols-3">
              {[
                ["Open API", "Integrate with your stack"],
                ["Actionable alerts", "Know fills, risks, and health"],
                ["No profit promises", "Automation still carries market risk"],
              ].map(([title, body]) => (
                <div key={title} className="flex gap-3">
                  <CircleDollarSign
                    aria-hidden="true"
                    className="mt-0.5 text-[#1f66ff]"
                    size={22}
                    strokeWidth={2.4}
                  />
                  <div>
                    <p className="text-sm font-black">{title}</p>
                    <p className="mt-1 text-sm text-white/58">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-6 max-w-3xl text-sm leading-6 text-black/58">
            Trading foreign exchange, indices, metals, and automated systems
            involves risk. BurrFx is a control and automation surface, not a
            guarantee of results.
          </p>
        </div>
      </section>

      <section
        id="affiliates"
        className="border-y border-black/10 bg-white px-5 py-16 sm:px-8 lg:px-10"
      >
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
          <div>
            <SectionLabel>Affiliates</SectionLabel>
            <h2 className="text-4xl font-black leading-none sm:text-6xl">
              Broker affiliation placements for Exness and Deriv.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-black/64">
              These placements are ready for partner URLs, campaign details,
              and onboarding copy once the affiliate assets are finalized.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {affiliatePartners.map((partner) => (
              <article
                className="rounded-[8px] border border-black/10 bg-[#f4f1e8] p-5 shadow-[0_14px_44px_rgba(8,11,10,0.06)]"
                key={partner.title}
              >
                <div className="mb-8 flex items-start justify-between gap-4">
                  <div
                    className={`flex h-14 min-w-44 items-center rounded-[8px] px-4 ${partner.logoSurface}`}
                  >
                    <Image
                      alt={partner.logo.alt}
                      className={partner.logo.className}
                      height={partner.logo.height}
                      src={partner.logo.src}
                      width={partner.logo.width}
                    />
                  </div>
                  <span className="rounded-[6px] bg-black/[0.06] px-2 py-1 text-xs font-black uppercase text-black/58">
                    Placeholder
                  </span>
                </div>
                <h3 className="text-3xl font-black">{partner.title}</h3>
                <p className="mt-3 text-sm leading-6 text-black/62">
                  {partner.body}
                </p>
                <div className="mt-6 rounded-[6px] border border-dashed border-black/24 bg-white px-3 py-3 text-sm font-black text-black/58">
                  {partner.placeholder}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
