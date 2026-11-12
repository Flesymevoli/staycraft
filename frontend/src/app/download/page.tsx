import Link from "next/link";
import "../landing.css";

export const dynamic = "force-dynamic";

function installerUrl() {
  const configured = process.env.DESKTOP_DOWNLOAD_URL;
  if (!configured) return null;
  try {
    const url = new URL(configured);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export default async function DesktopDownload({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const zh = (await searchParams).lang !== "en";
  const installer = installerUrl();
  return (
    <main className="landing">
      <div className="landing-intro">
        <h1>{zh ? "下载 StayCraft 桌面端" : "Download StayCraft for desktop"}</h1>
        <p>{zh ? "使用自己的账号导入订单，管理民宿经营数据。" : "Use your own account to import bookings and manage your property data."}</p>
        <div className="landing-actions">
          {installer ? (
            <a className="landing-cta" href={installer}>{zh ? "下载安装包" : "Download installer"} ↓</a>
          ) : (
            <p role="status">{zh ? "桌面端安装包尚未发布。" : "The desktop installer hasn’t been released yet."}</p>
          )}
          <Link className="landing-discover" href="/">{zh ? "返回首页" : "Back to home"} →</Link>
        </div>
      </div>
    </main>
  );
}
