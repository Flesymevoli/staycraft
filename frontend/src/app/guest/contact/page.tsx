import { GuestClient } from "@/components/guest-client";

export const metadata = { title: "联系民宿 · 湖畔小筑" };
export default async function ContactPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  return <GuestClient view="contact" orderId={order} />;
}
