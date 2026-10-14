import type { Metadata } from "next";
import { HomeClient } from "@/components/home-client";

export const metadata: Metadata = {
  title: "Home · Homestay AI",
  description: "Native Next.js Home screen for the Homestay AI prototype",
};

export default function NativeHomePage() {
  return <HomeClient />;
}
