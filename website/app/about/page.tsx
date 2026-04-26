import type { Metadata } from "next";
import {
  ArrowRight,
  CheckCircle2,
  Mail,
  Server,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";
import { SiteHeader } from "@/app/_components/site-header";
import { SiteFooter } from "@/app/_components/site-footer";
import { submitContact } from "./actions";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about BurrFx, a self-hosted MT5 trading bot control system built around automation, risk discipline, API control, and mobile visibility.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About BurrFx",
    description:
      "BurrFx builds self-hosted MT5 automation tools for traders who want strategy execution with risk discipline and control.",
    url: "/about",
  },
};

const principles = [
  {
    title: "Control before speed",
    body: "Automation should earn the right to place an order by passing risk, session, spread, and account-state checks first.",
    icon: ShieldCheck,
  },
  {
    title: "Self-hosted by design",
    body: "BurrFx keeps the execution bridge close to MetaTrader 5 so traders can own the server, terminal, and rules.",
    icon: Server,
  },
  {
    title: "Visible from mobile",
    body: "The Android companion app keeps bot state, logs, and account visibility close while iOS support is prepared.",
    icon: Smartphone,
  },
];

const contactMessages: Record<string, string> = {
  failed:
    "Your message could not be delivered to the configured contact endpoint. Please try again shortly.",
  missing: "Please add your name, email, and message before sending.",
  sent: "Thanks. Your BurrFx contact request has been received.",
};

export default async function AboutPage({
  searchParams,
}: {
  searchParams: Promise<{ contact?: string | string[] }>;
}) {
  const { contact } = await searchParams;
  const contactState = Array.isArray(contact) ? contact[0] : contact;

  return (
    <main className="min-h-screen bg-[#f4f1e8] text-[#080b0a]">
      <SiteHeader active="about" />

      <section className="market-grid bg-[#070a09] px-5 py-16 text-white sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
          <div>
            <p className="mb-5 inline-flex w-fit items-center gap-2 rounded-[6px] border border-white/12 bg-white/[0.04] px-3 py-2 text-xs font-black uppercase text-white/72">
              <Users aria-hidden="true" className="text-[#33e060]" size={15} />
              About BurrFx
            </p>
            <h1 className="max-w-4xl text-5xl font-black leading-[0.92] sm:text-7xl">
              Automation for traders who still want the final word.
            </h1>
          </div>
          <p className="max-w-2xl text-lg leading-8 text-white/68">
            BurrFx is built for MT5 operators who want strategy automation
            without turning risk discipline into an afterthought. The product
            connects market data, strategy logic, a FastAPI control bridge, and
            mobile visibility into one self-hosted workflow.
          </p>
        </div>
      </section>

      <section className="px-5 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-3">
          {principles.map((item) => (
            <article
              className="rounded-[8px] border border-black/12 bg-white p-5 shadow-[0_12px_36px_rgba(8,11,10,0.06)]"
              key={item.title}
            >
              <item.icon
                aria-hidden="true"
                className="mb-8 text-[#1f66ff]"
                size={34}
                strokeWidth={2.5}
              />
              <h2 className="text-2xl font-black">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-black/62">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8 lg:px-10">
        <div
          id="contact"
          className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start"
        >
          <div>
            <p className="mb-4 text-xs font-black uppercase text-[#1f66ff]">
              Contact
            </p>
            <h2 className="text-4xl font-black leading-none sm:text-6xl">
              Talk to us about the bot, the app, or your MT5 stack.
            </h2>
            <div className="mt-8 grid gap-3">
              {[
                "Google-only onboarding",
                "Android companion app available now",
                "Self-hosted FastAPI control layer",
              ].map((item) => (
                <div className="flex items-center gap-3" key={item}>
                  <CheckCircle2
                    aria-hidden="true"
                    className="text-[#33b957]"
                    size={21}
                    strokeWidth={2.6}
                  />
                  <span className="text-sm font-bold text-black/68">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <form
            action={submitContact}
            className="rounded-[8px] border border-black/12 bg-white p-5 shadow-[0_18px_54px_rgba(8,11,10,0.08)] sm:p-6"
          >
            <div className="mb-6 flex items-center gap-3">
              <Mail
                aria-hidden="true"
                className="text-[#1f66ff]"
                size={32}
                strokeWidth={2.5}
              />
              <div>
                <h3 className="text-2xl font-black">Contact BurrFx</h3>
                <p className="mt-1 text-sm text-black/56">
                  Share what you want to automate.
                </p>
              </div>
            </div>

            {contactState ? (
              <p
                className={`mb-5 rounded-[6px] border p-3 text-sm font-bold leading-6 ${
                  contactState === "sent"
                    ? "border-[#33e060]/40 bg-[#33e060]/10 text-[#126b2e]"
                    : "border-[#f2a51a]/40 bg-[#f2a51a]/10 text-[#76510d]"
                }`}
              >
                {contactMessages[contactState] ??
                  "The contact form could not be processed."}
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-black" htmlFor="name">
                Name
                <input
                  className="h-12 rounded-[6px] border border-black/12 bg-[#f4f1e8] px-3 text-sm font-bold outline-none transition focus:border-[#1f66ff] focus:ring-2 focus:ring-[#1f66ff]/20"
                  id="name"
                  minLength={2}
                  name="name"
                  required
                  type="text"
                />
              </label>
              <label className="grid gap-2 text-sm font-black" htmlFor="email">
                Email
                <input
                  className="h-12 rounded-[6px] border border-black/12 bg-[#f4f1e8] px-3 text-sm font-bold outline-none transition focus:border-[#1f66ff] focus:ring-2 focus:ring-[#1f66ff]/20"
                  id="email"
                  name="email"
                  required
                  type="email"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label
                className="grid gap-2 text-sm font-black"
                htmlFor="company"
              >
                Company
                <input
                  className="h-12 rounded-[6px] border border-black/12 bg-[#f4f1e8] px-3 text-sm font-bold outline-none transition focus:border-[#1f66ff] focus:ring-2 focus:ring-[#1f66ff]/20"
                  id="company"
                  name="company"
                  type="text"
                />
              </label>
              <label className="grid gap-2 text-sm font-black" htmlFor="topic">
                Topic
                <select
                  className="h-12 rounded-[6px] border border-black/12 bg-[#f4f1e8] px-3 text-sm font-bold outline-none transition focus:border-[#1f66ff] focus:ring-2 focus:ring-[#1f66ff]/20"
                  id="topic"
                  name="topic"
                  required
                >
                  <option>Product demo</option>
                  <option>Trading automation</option>
                  <option>Android companion app</option>
                  <option>Partnership</option>
                </select>
              </label>
            </div>

            <label
              className="mt-4 grid gap-2 text-sm font-black"
              htmlFor="message"
            >
              Message
              <textarea
                className="min-h-36 rounded-[6px] border border-black/12 bg-[#f4f1e8] px-3 py-3 text-sm font-bold leading-6 outline-none transition focus:border-[#1f66ff] focus:ring-2 focus:ring-[#1f66ff]/20"
                id="message"
                minLength={20}
                name="message"
                required
              />
            </label>

            <button
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[6px] border border-[#33e060] bg-[#33e060] px-5 text-sm font-black text-black shadow-[0_18px_48px_rgba(51,224,96,0.18)] transition hover:bg-[#62ef82] sm:w-auto"
              type="submit"
            >
              Send message
              <ArrowRight aria-hidden="true" size={18} strokeWidth={3} />
            </button>
          </form>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
