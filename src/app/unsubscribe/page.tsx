import type { Metadata } from "next";
import { UnsubscribeForm } from "./unsubscribe-form";

export const metadata: Metadata = { title: "Relative alerts", robots: { index: false } };

export default function UnsubscribePage() {
  return <UnsubscribeForm />;
}
