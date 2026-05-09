import Image from "next/image";
import type { Metadata } from "next";
import { SiteFooter } from "@/app/_components/site-footer";
import { SiteHeader } from "@/app/_components/site-header";

export const metadata: Metadata = {
  title: "Icon Catalog",
  description:
    "BurrFx platform icon catalog with generated desktop, mobile, web, and README assets.",
};

type IconAsset = {
  title: string;
  fileName: string;
  sourcePath: string;
  src: string;
  width: number;
  height: number;
  treatment?: "transparent" | "dark";
};

type IconNote = {
  title: string;
  fileName: string;
  sourcePath: string;
  detail: string;
};

const brandMasters: IconAsset[] = [
  {
    title: "Desktop BurrFx wordmark",
    fileName: "burrfx-desktop-wordmark-1024.png",
    sourcePath: "assets/brand/burrfx-desktop-wordmark-1024.png",
    src: "/icon-catalog/brand/burrfx-desktop-wordmark-1024.png",
    width: 1024,
    height: 1024,
    treatment: "transparent",
  },
  {
    title: "Mobile fx master",
    fileName: "burrfx-mobile-fx-1024.png",
    sourcePath: "assets/brand/burrfx-mobile-fx-1024.png",
    src: "/icon-catalog/brand/burrfx-mobile-fx-1024.png",
    width: 1024,
    height: 1024,
    treatment: "transparent",
  },
];

const desktopCore: IconAsset[] = [
  {
    title: "Tauri 32",
    fileName: "32x32.png",
    sourcePath: "desktop-app/src-tauri/icons/32x32.png",
    src: "/icon-catalog/desktop/32x32.png",
    width: 32,
    height: 32,
    treatment: "transparent",
  },
  {
    title: "Tauri 128",
    fileName: "128x128.png",
    sourcePath: "desktop-app/src-tauri/icons/128x128.png",
    src: "/icon-catalog/desktop/128x128.png",
    width: 128,
    height: 128,
    treatment: "transparent",
  },
  {
    title: "Tauri 256",
    fileName: "128x128@2x.png",
    sourcePath: "desktop-app/src-tauri/icons/128x128@2x.png",
    src: "/icon-catalog/desktop/128x128@2x.png",
    width: 256,
    height: 256,
    treatment: "transparent",
  },
  {
    title: "Tauri 512",
    fileName: "icon.png",
    sourcePath: "desktop-app/src-tauri/icons/icon.png",
    src: "/icon-catalog/desktop/icon.png",
    width: 512,
    height: 512,
    treatment: "transparent",
  },
];

const desktopStore: IconAsset[] = [
  ["Square30x30Logo.png", 30],
  ["Square44x44Logo.png", 44],
  ["StoreLogo.png", 50],
  ["Square71x71Logo.png", 71],
  ["Square89x89Logo.png", 89],
  ["Square107x107Logo.png", 107],
  ["Square142x142Logo.png", 142],
  ["Square150x150Logo.png", 150],
  ["Square284x284Logo.png", 284],
  ["Square310x310Logo.png", 310],
].map(([fileName, size]) => ({
  title: `Windows ${size}`,
  fileName: String(fileName),
  sourcePath: `desktop-app/src-tauri/icons/${fileName}`,
  src: `/icon-catalog/desktop/${fileName}`,
  width: Number(size),
  height: Number(size),
  treatment: "transparent" as const,
}));

const mobileExpo: IconAsset[] = [
  {
    title: "App icon",
    fileName: "icon.png",
    sourcePath: "burrfx/assets/images/icon.png",
    src: "/icon-catalog/mobile/icon.png",
    width: 1024,
    height: 1024,
  },
  {
    title: "Adaptive foreground",
    fileName: "android-icon-foreground.png",
    sourcePath: "burrfx/assets/images/android-icon-foreground.png",
    src: "/icon-catalog/mobile/android-icon-foreground.png",
    width: 1024,
    height: 1024,
    treatment: "transparent",
  },
  {
    title: "Adaptive background",
    fileName: "android-icon-background.png",
    sourcePath: "burrfx/assets/images/android-icon-background.png",
    src: "/icon-catalog/mobile/android-icon-background.png",
    width: 1024,
    height: 1024,
    treatment: "dark",
  },
  {
    title: "Themed monochrome",
    fileName: "android-icon-monochrome.png",
    sourcePath: "burrfx/assets/images/android-icon-monochrome.png",
    src: "/icon-catalog/mobile/android-icon-monochrome.png",
    width: 1024,
    height: 1024,
    treatment: "transparent",
  },
];

const webReadme: IconAsset[] = [
  {
    title: "Website favicon preview",
    fileName: "favicon.ico",
    sourcePath: "website/app/favicon.ico",
    src: "/icon-catalog/web/website-favicon-preview.png",
    width: 64,
    height: 64,
  },
  {
    title: "Expo web favicon",
    fileName: "favicon.png",
    sourcePath: "burrfx/assets/images/favicon.png",
    src: "/icon-catalog/web/mobile-favicon.png",
    width: 48,
    height: 48,
  },
  {
    title: "README desktop preview",
    fileName: "burrfx-desktop-wordmark-1024.png",
    sourcePath: "assets/brand/burrfx-desktop-wordmark-1024.png",
    src: "/icon-catalog/brand/burrfx-desktop-wordmark-1024.png",
    width: 1024,
    height: 1024,
    treatment: "transparent",
  },
  {
    title: "README mobile preview",
    fileName: "burrfx-mobile-fx-1024.png",
    sourcePath: "assets/brand/burrfx-mobile-fx-1024.png",
    src: "/icon-catalog/brand/burrfx-mobile-fx-1024.png",
    width: 1024,
    height: 1024,
    treatment: "transparent",
  },
];

const desktopNotes: IconNote[] = [
  {
    title: "Windows ICO",
    fileName: "icon.ico",
    sourcePath: "desktop-app/src-tauri/icons/icon.ico",
    detail: "Multi-size Windows icon generated by Tauri.",
  },
  {
    title: "macOS ICNS",
    fileName: "icon.icns",
    sourcePath: "desktop-app/src-tauri/icons/icon.icns",
    detail: "macOS icon bundle generated by Tauri.",
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-black uppercase text-[#33e060]">
      {children}
    </p>
  );
}

function IconSection({
  body,
  items,
  notes = [],
  title,
}: {
  body: string;
  items: IconAsset[];
  notes?: IconNote[];
  title: string;
}) {
  return (
    <section className="border-t border-white/10 py-10">
      <div className="mb-6 grid gap-3 md:grid-cols-[0.44fr_0.56fr] md:items-end">
        <h2 className="text-3xl font-black leading-none text-white sm:text-4xl">
          {title}
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-white/62 md:justify-self-end md:text-right">
          {body}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <IconCard item={item} key={`${item.sourcePath}-${item.title}`} />
        ))}
      </div>

      {notes.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {notes.map((note) => (
            <div
              className="rounded-[8px] border border-white/10 bg-white/[0.04] p-4"
              key={note.sourcePath}
            >
              <p className="text-sm font-black text-white">{note.title}</p>
              <p className="mt-2 font-mono text-xs text-[#33e060]">
                {note.fileName}
              </p>
              <p className="mt-2 text-xs leading-5 text-white/54">
                {note.detail}
              </p>
              <p className="mt-3 break-all font-mono text-[11px] text-white/42">
                {note.sourcePath}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function IconCard({ item }: { item: IconAsset }) {
  const previewClass =
    item.treatment === "transparent"
      ? "bg-[linear-gradient(45deg,rgba(255,255,255,0.08)_25%,transparent_25%),linear-gradient(-45deg,rgba(255,255,255,0.08)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,rgba(255,255,255,0.08)_75%),linear-gradient(-45deg,transparent_75%,rgba(255,255,255,0.08)_75%)] bg-[length:18px_18px] bg-[position:0_0,0_9px,9px_-9px,-9px_0px]"
      : "bg-[#030605]";

  return (
    <article className="rounded-[8px] border border-white/10 bg-white/[0.04] p-4">
      <div
        className={`flex aspect-square items-center justify-center overflow-hidden rounded-[8px] border border-white/10 ${previewClass}`}
      >
        <Image
          alt={`${item.title} ${item.width} by ${item.height}`}
          className="h-[72%] w-[72%] object-contain"
          height={item.height}
          src={item.src}
          width={item.width}
        />
      </div>
      <div className="mt-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-black text-white">{item.title}</h3>
          <span className="shrink-0 rounded-[6px] bg-[#33e060] px-2 py-1 text-xs font-black text-black">
            {item.width}x{item.height}
          </span>
        </div>
        <p className="mt-3 font-mono text-xs text-[#33e060]">
          {item.fileName}
        </p>
        <p className="mt-3 break-all font-mono text-[11px] leading-5 text-white/42">
          {item.sourcePath}
        </p>
      </div>
    </article>
  );
}

export default function IconsPage() {
  return (
    <main className="min-h-screen bg-[#070a09] text-white">
      <SiteHeader active="home" />

      <div className="market-grid">
        <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
          <section className="pb-10">
            <SectionLabel>Icon system</SectionLabel>
            <h1 className="max-w-4xl text-5xl font-black leading-none text-white sm:text-7xl">
              BurrFx platform icon catalog.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-white/68">
              Desktop keeps the circular teal and yellow BurrFx mark. Mobile
              uses the lowercase green fx mark across Expo Android assets.
            </p>
          </section>

          <IconSection
            body="The source images used to generate the platform-specific icon sets."
            items={brandMasters}
            title="Brand Masters"
          />
          <IconSection
            body="Desktop package icons generated for the Tauri app, including Windows Store square assets."
            items={[...desktopCore, ...desktopStore]}
            notes={desktopNotes}
            title="Desktop / Tauri"
          />
          <IconSection
            body="Expo Android app icons generated from the lowercase BurrFx green fx mark."
            items={mobileExpo}
            title="Mobile / Expo Android"
          />
          <IconSection
            body="Small-format icon assets used for browser chrome and README previews."
            items={webReadme}
            title="Web / README"
          />
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
