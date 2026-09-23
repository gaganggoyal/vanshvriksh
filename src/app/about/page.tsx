import type { Metadata } from "next";
import { AboutContent } from "@/components/site/about-content";
import { PublicPage } from "@/components/site/public-page";

export const metadata: Metadata = {
  title: "About us",
  description: "Why we built Mera Vansh, and the people behind it — Gagan (Founder) and Vansh (Co-founder).",
};

export default function AboutPage() {
  return (
    <PublicPage>
      <AboutContent />
    </PublicPage>
  );
}
