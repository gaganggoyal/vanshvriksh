import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { BRAND, BRAND_TITLE } from "@/lib/brand";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});
const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});
const deva = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-deva",
});

const description =
  "Find the relatives your family never wrote down. A private family tree that finds the same people in other families' trees — in English or हिन्दी — without ever showing a date of birth.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || BRAND.url),
  title: { default: `${BRAND_TITLE} · ${BRAND.nameHi}`, template: `%s · ${BRAND.name}` },
  description,
  applicationName: BRAND.name,
  keywords: ["family tree", "vansh", "वंश", "genealogy", "find relatives", "Indian family tree", "kinship", "रिश्तेदार"],
  icons: { icon: "/favicon.svg" },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: BRAND.name, statusBarStyle: "default" },
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: BRAND_TITLE,
    description,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: BRAND_TITLE, description },
};

export const viewport: Viewport = {
  themeColor: BRAND.themeColor,
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
