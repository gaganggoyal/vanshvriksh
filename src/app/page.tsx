import { LocaleProvider } from "@/components/locale";
import { Landing } from "@/components/landing";
import { demoEnabled } from "@/lib/auth";
import { siteStats } from "@/lib/discover";

export const dynamic = "force-dynamic";

export default async function Page() {
  const stats = await siteStats().catch(() => ({ families: 0, people: 0, remembered: 0, linked: 0 }));
  return (
    <LocaleProvider>
      <Landing stats={stats} demo={demoEnabled()} />
    </LocaleProvider>
  );
}
