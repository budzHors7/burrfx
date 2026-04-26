import type { Metadata } from "next";
import {
  CheckCircle2,
  Cloud,
  Download,
  Gauge,
  Server,
  Smartphone,
  TerminalSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SiteHeader } from "@/app/_components/site-header";
import { getSession } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: {
    index: false,
    follow: false,
  },
};

const windowsInstallerUrl =
  process.env.NEXT_PUBLIC_WINDOWS_INSTALLER_URL ??
  "/downloads/burrfx-windows-installer.exe";

const isLocalWindowsInstaller = windowsInstallerUrl.startsWith("/");

const androidAppUrl =
  process.env.NEXT_PUBLIC_ANDROID_APP_URL ??
  "https://play.google.com/store/search?q=BurrFx&c=apps";

const serverSetupOptions: Array<{
  body: string;
  icon: LucideIcon;
  label: string;
  note: string;
  steps: string[];
  title: string;
}> = [
  {
    body: "Use a Windows Server machine, workstation, or spare old PC that can stay online beside your broker terminal.",
    icon: Server,
    label: "Local server",
    note: "Best when you want the broker terminal, BurrFx host, and logs inside your own network.",
    title: "Run BurrFx on a local Windows Server or old PC",
    steps: [
      "Install Windows Server or Windows Pro, run all updates, and enable Remote Desktop for maintenance.",
      "Give the machine a static LAN IP address and keep it on wired power and internet where possible.",
      "Install MetaTrader 5, sign in to the broker account, then install the BurrFx Windows host.",
      "Start the BurrFx host and expose the FastAPI control URL only through your LAN, VPN, or a secured tunnel.",
      "Point the Android companion app to that reachable server URL and verify health checks before live trading.",
    ],
  },
  {
    body: "Create a cloud Windows VM when you need the bot to stay online without depending on home or office hardware.",
    icon: Cloud,
    label: "Azure VM",
    note: "Use strict firewall rules, RDP access controls, and cost monitoring before leaving the VM running.",
    title: "Run BurrFx on Azure Windows Server",
    steps: [
      "Create an Azure Virtual Machine with a Windows Server 2022 image and a region close to your broker/VPS needs.",
      "Use RDP to connect, install Windows updates, MetaTrader 5, and the BurrFx Windows host.",
      "Restrict inbound access with Network Security Group rules; keep RDP limited to your IP or use a VPN/Bastion path.",
      "Configure BurrFx to run after reboot, keep MT5 signed in, and store the FastAPI URL for the mobile app.",
      "Test demo execution, logs, and alerts before switching the bot to a live account.",
    ],
  },
];

async function readDashboardSession() {
  try {
    return await getSession();
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const session = await readDashboardSession();

  return (
    <main className="min-h-screen bg-[#f4f1e8] text-[#080b0a]">
      <SiteHeader active="dashboard" session={session} />

      <section className="market-grid bg-[#070a09] px-5 py-12 text-white sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <p className="mb-5 inline-flex w-fit items-center gap-2 rounded-[6px] border border-white/12 bg-white/[0.04] px-3 py-2 text-xs font-black uppercase text-white/72">
            <Gauge aria-hidden="true" className="text-[#33e060]" size={15} />
            BurrFx dashboard
          </p>
          <h1 className="max-w-4xl text-5xl font-black leading-[0.92] sm:text-7xl">
            Download BurrFx and pair your{" "}
            <span className="text-[#33e060]">MT5 host</span>.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/68">
            Get the Windows host, follow the installation steps, and connect
            the Android companion app to keep bot visibility close.
          </p>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <article className="grid gap-6 rounded-[8px] border border-black/12 bg-[#080b0a] p-6 text-white shadow-[0_18px_54px_rgba(8,11,10,0.14)] lg:grid-cols-[auto_1fr_auto] lg:items-center lg:p-8">
            <div className="grid h-14 w-14 place-items-center rounded-[8px] bg-white/[0.06] text-[#33e060]">
              <TerminalSquare aria-hidden="true" size={34} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-black uppercase text-white/48">
                Windows software
              </p>
              <h2 className="mt-2 max-w-3xl text-3xl font-black leading-tight sm:text-4xl">
                Download the BurrFx MT5 host installer.
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-white/62">
                Install the Windows host on the same machine that runs
                MetaTrader 5 so BurrFx can keep the terminal bridge local.
              </p>
            </div>
            <div className="flex flex-col gap-3 lg:min-w-[260px] lg:items-stretch">
              <a
                className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-[#33e060] bg-[#33e060] px-5 text-sm font-black text-black transition hover:bg-[#62ef82] focus:outline-none focus:ring-2 focus:ring-[#33e060] focus:ring-offset-2 focus:ring-offset-[#080b0a]"
                download={isLocalWindowsInstaller ? true : undefined}
                href={windowsInstallerUrl}
                rel={isLocalWindowsInstaller ? undefined : "noreferrer"}
                target={isLocalWindowsInstaller ? undefined : "_blank"}
              >
                <Download aria-hidden="true" size={18} strokeWidth={3} />
                Download Windows installer
              </a>
              <p className="text-xs font-bold leading-5 text-white/42 lg:text-right">
                Set NEXT_PUBLIC_WINDOWS_INSTALLER_URL when the signed production
                installer is uploaded.
              </p>
            </div>
          </article>
        </div>

        <div className="mx-auto mt-5 max-w-7xl">
          <article className="grid gap-6 rounded-[8px] border border-black/12 bg-white p-6 shadow-[0_12px_36px_rgba(8,11,10,0.06)] lg:grid-cols-[auto_1fr_auto] lg:items-center">
            <div className="grid h-14 w-14 place-items-center rounded-[8px] bg-[#080b0a] text-[#33e060]">
              <Smartphone aria-hidden="true" size={30} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-black uppercase text-black/48">
                Mobile application
              </p>
              <h2 className="mt-2 text-3xl font-black">
                Download the Android companion app.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-black/62">
                Android is available now. iOS is coming soon. Use the mobile app
                to watch bot state, alerts, logs, and account health from the
                same BurrFx control layer.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <a
                className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-[#33e060] bg-[#33e060] px-4 text-sm font-black text-black transition hover:bg-[#62ef82] focus:outline-none focus:ring-2 focus:ring-[#33e060] focus:ring-offset-2"
                href={androidAppUrl}
                rel="noreferrer"
                target="_blank"
              >
                <Download aria-hidden="true" size={17} strokeWidth={3} />
                Download Android app
              </a>
              <span className="inline-flex h-11 items-center justify-center gap-2 rounded-[6px] border border-black/10 px-4 text-sm font-black text-black/58">
                <CheckCircle2
                  aria-hidden="true"
                  className="text-[#1f66ff]"
                  size={17}
                  strokeWidth={2.5}
                />
                iOS coming soon
              </span>
            </div>
          </article>
        </div>

        <div className="mx-auto mt-12 max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
            <div>
              <p className="text-sm font-black uppercase text-[#1f66ff]">
                Server setup paths
              </p>
              <h2 className="mt-3 text-4xl font-black leading-none sm:text-5xl">
                Run the bot locally or host it on Azure.
              </h2>
            </div>
            <p className="max-w-3xl text-sm font-bold leading-6 text-black/62 lg:justify-self-end">
              BurrFx needs a reachable Windows machine that can run MT5 and the
              local host process continuously. Pick the setup that matches your
              uptime, cost, and control needs.
            </p>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {serverSetupOptions.map((option) => (
              <article
                className="rounded-[8px] border border-black/12 bg-white p-6 shadow-[0_12px_36px_rgba(8,11,10,0.06)]"
                key={option.title}
              >
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[8px] bg-[#080b0a] text-[#33e060]">
                    <option.icon
                      aria-hidden="true"
                      size={27}
                      strokeWidth={2.5}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-black/42">
                      {option.label}
                    </p>
                    <h3 className="mt-2 text-2xl font-black leading-tight">
                      {option.title}
                    </h3>
                    <p className="mt-3 text-sm font-bold leading-6 text-black/58">
                      {option.body}
                    </p>
                  </div>
                </div>

                <ol className="mt-6 grid gap-3">
                  {option.steps.map((step, index) => (
                    <li
                      className="grid grid-cols-[auto_1fr] gap-3 rounded-[6px] border border-black/10 bg-[#f4f1e8] p-3"
                      key={step}
                    >
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-[#1f66ff] text-xs font-black text-white">
                        {index + 1}
                      </span>
                      <span className="text-sm font-bold leading-6 text-black/68">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>

                <p className="mt-5 rounded-[6px] border border-black/10 bg-black/[0.03] p-3 text-xs font-bold leading-5 text-black/54">
                  {option.note}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
