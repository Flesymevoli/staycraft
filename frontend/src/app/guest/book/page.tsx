import { GuestClient } from "@/components/guest-client";

export const metadata = { title: "确认预订 · 湖畔小筑" };
export default async function BookPage({ searchParams }: { searchParams: Promise<{ room?: string; arrival?: string; departure?: string; guests?: string }> }) {
  const params = await searchParams;
  return <GuestClient view="book" bookingParams={params} />;
}
