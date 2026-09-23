import type { Metadata } from "next";
import { AuthForm } from "@/components/site/auth-form";
import { PublicPage } from "@/components/site/public-page";
import { demoEnabled } from "@/lib/auth";

export const metadata: Metadata = { title: "Create your family tree" };
export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <PublicPage>
      <AuthForm mode="register" demo={demoEnabled()} />
    </PublicPage>
  );
}
