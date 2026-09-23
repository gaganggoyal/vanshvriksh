import { redirect } from "next/navigation";

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/tree?person=${id}`);
}
