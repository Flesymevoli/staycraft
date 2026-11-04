import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StayCraft · AI 经营决策工作台",
  robots: { index: false, follow: false },
  description: "为小型民宿经营者提供主动经营分析、市场价格调查与决策支持。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
