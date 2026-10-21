import { notFound } from "next/navigation";
import { renderWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function WorkspacePage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section !== "work" && section !== "analysis" && section !== "explore" && section !== "mine") notFound();
  return renderWorkspace(section);
}
