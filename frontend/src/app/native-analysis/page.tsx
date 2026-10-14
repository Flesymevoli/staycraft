import type { Metadata } from "next";
import { AnalysisClient } from "@/components/analysis-client";

export const metadata: Metadata = {
  title: "Analysis · Homestay AI",
  description: "Sample occupancy analysis for a homestay",
};

export default function NativeAnalysisPage() {
  return <AnalysisClient />;
}
