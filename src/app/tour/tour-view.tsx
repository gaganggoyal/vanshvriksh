"use client";

import Link from "next/link";
import { ArrowRight, Download, PlayCircle } from "lucide-react";
import { LocaleProvider, useCopy } from "@/components/locale";
import { PublicPage } from "@/components/site/public-page";
import { FamilyTour } from "@/components/tour/family-tour";

function Page() {
  const { c, locale } = useCopy();
  return (
    <div className="mx-auto max-w-5xl px-5 py-12 lg:py-16">
      <div className="text-center">
        <span className="eyebrow">
          <PlayCircle className="h-3.5 w-3.5" /> {c.tourEyebrow}
        </span>
        <h1 className="mx-auto mt-4 max-w-3xl font-display text-3xl font-bold tracking-tight sm:text-5xl">{c.tourTitle}</h1>
        <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-ink/65">{c.tourBody}</p>
      </div>
      <div className="mt-10">
        <FamilyTour />
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/register" className="btn-primary !px-6 !py-3">
          {c.tourStart} <ArrowRight className="h-4 w-4" />
        </Link>
        <a href={`/media/mera-vansh-tour-${locale}.mp4`} download className="btn-ghost !px-5 !py-3">
          <Download className="h-4 w-4" /> {c.tourDownload}
        </a>
      </div>
    </div>
  );
}

export function TourView({ record, lang }: { record: boolean; lang: "en" | "hi" }) {
  if (record) {
    return (
      <LocaleProvider initial={lang}>
        <div className="h-[720px] w-[1280px] overflow-hidden">
          <FamilyTour record />
        </div>
      </LocaleProvider>
    );
  }
  return (
    <PublicPage>
      <Page />
    </PublicPage>
  );
}
