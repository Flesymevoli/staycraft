import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Homestay AI · Interactive Prototype",
  description: "Five-screen mobile prototype with sample homestay data",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
