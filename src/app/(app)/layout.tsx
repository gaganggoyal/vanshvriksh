import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppFrame } from "./frame";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user) redirect("/login");
  const pending = user.tree
    ? await prisma.match.count({
        where: {
          status: "PENDING",
          OR: [{ personA: { treeId: user.tree.id } }, { personB: { treeId: user.tree.id } }],
        },
      })
    : 0;
  return (
    <AppFrame locale={user.locale === "hi" ? "hi" : "en"} pending={pending} email={user.email}>
      {children}
    </AppFrame>
  );
}
