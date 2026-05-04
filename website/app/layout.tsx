import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
);

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "BurrFx | MT5 Trading Bot Control System",
    template: "%s | BurrFx",
  },
  description:
    "BurrFx is a self-hosted MetaTrader 5 trading bot control system with strategy automation, risk profiles, API controls, and mobile visibility.",
  applicationName: "BurrFx",
  keywords: [
    "BurrFx",
    "MetaTrader 5 trading bot",
    "MT5 automation",
    "forex trading bot",
    "algorithmic trading",
    "self-hosted trading bot",
    "FastAPI trading dashboard",
    "risk management trading bot",
  ],
  authors: [{ name: "BurrFx" }],
  creator: "BurrFx",
  publisher: "BurrFx",
  category: "financial technology",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "BurrFx | MT5 Trading Bot Control System",
    description:
      "Self-hosted MT5 automation with strategy logic, risk profiles, API controls, and mobile monitoring.",
    url: "/",
    siteName: "BurrFx",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "BurrFx | MT5 Trading Bot Control System",
    description:
      "Self-hosted MT5 automation with strategy logic, risk profiles, API controls, and mobile monitoring.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
