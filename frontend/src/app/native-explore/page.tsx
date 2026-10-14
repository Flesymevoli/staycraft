import type { Metadata } from "next";
import { ExploreClient } from "@/components/explore-client";

export const metadata: Metadata = {
  title: "Explore · Homestay AI",
  description: "Sample local market signals and comparable stays",
};

export default function NativeExplorePage() {
  return <ExploreClient />;
}
