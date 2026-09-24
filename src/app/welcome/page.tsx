import type { Metadata } from "next";
import { WelcomeForm } from "./welcome-form";

export const metadata: Metadata = { title: "Create a password", robots: { index: false } };

export default function WelcomePage() {
  return <WelcomeForm />;
}
