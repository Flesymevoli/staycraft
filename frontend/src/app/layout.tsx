import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Staycraft · 民宿经营工作台",
  robots: { index: false, follow: false },
  description: "民宿客房管理、直接预订和经营日程",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
