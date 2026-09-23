import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});
const sans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});
const deva = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-deva",
});

export const metadata: Metadata = {
  title: "वंश वृक्ष — Vansh Vriksh",
  description:
    "A privacy-first family tree. Names on the canvas, dates of birth kept hidden and used only to recognise the same person across families.",
  icons: { icon: "/favicon.svg" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "वंश वृक्ष", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#6B1D2A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: browser extensions (Grammarly, ColorZilla, Dark Reader…) add
    // attributes to <html>/<body> before React hydrates; that is not a mismatch in our markup.
    <html lang="en" suppressHydrationWarning>
      <body className={`${display.variable} ${sans.variable} ${deva.variable} font-sans antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
