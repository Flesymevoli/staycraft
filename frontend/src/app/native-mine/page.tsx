import type { Metadata } from "next";
import { MineClient } from "@/components/mine-client";

export const metadata: Metadata = { title: "Mine · Homestay AI", description: "Sample property details" };
export default function NativeMinePage() { return <MineClient />; }
