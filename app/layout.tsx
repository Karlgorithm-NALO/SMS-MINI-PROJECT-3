import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Great_Vibes } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-bricolage",
});

const signature = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-signature",
});

export const metadata: Metadata = {
  title: "Nalo SMS Platform by Karlson · Real SMS & Delivery Reports",
  description:
    "Dispatches real SMS via Nalo Solutions SMS API with live character counters, dynamic sender IDs, and real-time delivery report tracking.",
  authors: [{ name: "Karlson" }],
};

export const viewport: Viewport = {
  themeColor: "#F6F5F2",
};

// Decides before first paint whether the intro plays: once per browser session,
// always with ?intro in the address, never for people who prefer reduced motion.
// Running this ahead of the page avoids a flash of content before the intro covers it.
const INTRO_GATE = `(function () {
  try {
    var root = document.documentElement;
    var forced = new URLSearchParams(window.location.search).has("intro");
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced && (forced || !sessionStorage.getItem("sikaledger:intro-seen"))) {
      root.setAttribute("data-intro", "play");
      sessionStorage.setItem("sikaledger:intro-seen", "1");
    }
  } catch (error) {}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The intro gate sets data-intro on <html> before React hydrates.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} ${bricolage.variable} ${signature.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: INTRO_GATE }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
