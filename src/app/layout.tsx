import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Unbounded } from "next/font/google";
import { ExperienceRoot } from "@/components/experience/ExperienceRoot";
import { HomeSections } from "@/components/site/HomeSections";
import { SiteChrome } from "@/components/site/SiteChrome";
import { profile } from "@/content";
import "./globals.css";

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["600", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${profile.name} — ${profile.role}`,
    template: `%s — ${profile.name}`,
  },
  description: profile.siteDescription,
  applicationName: profile.name,
  authors: [{ name: profile.name }],
  openGraph: {
    title: `${profile.name} — ${profile.role}`,
    description: profile.siteDescription,
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0a0303",
  colorScheme: "dark",
};

// Swaps the `no-js` class before first paint so the decode effect can hide
// its static text only when JavaScript is actually running. Constant string,
// no interpolation.
const NO_JS_SWAP = "document.documentElement.classList.replace('no-js','js')";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${plexMono.variable} ${unbounded.variable} no-js`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_JS_SWAP }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-ink focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <ExperienceRoot />
        <SiteChrome />
        <HomeSections />
        {children}
      </body>
    </html>
  );
}
