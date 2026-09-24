import type { Metadata } from "next";
import { TourView } from "./tour-view";

export const metadata: Metadata = {
  title: "30-second tour",
  description: "Watch an example family tree find a relative on Mera Vansh — across spellings, in English and हिन्दी, without showing anyone's date of birth.",
};

/** /tour — the shareable page; /tour?record=1&lang=hi is the 1280×720 frame the MP4 is recorded from. */
export default async function TourPage({ searchParams }: { searchParams: Promise<{ record?: string; lang?: string }> }) {
  const { record, lang } = await searchParams;
  return <TourView record={record === "1"} lang={lang === "hi" ? "hi" : "en"} />;
}
