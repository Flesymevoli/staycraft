import type { Metadata } from "next";
import { WorkClient } from "@/components/work-client";

export const metadata: Metadata = {
  title: "Work · Homestay AI",
  description: "Native Next.js Work screen for the Homestay AI prototype",
};

export default async function NativeWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ task?: string }>;
}) {
  const { task } = await searchParams;
  const initialTask = task === "reply" || task === "promotion" || task === "analysis" ? task : null;
  return <WorkClient initialTask={initialTask} />;
}
