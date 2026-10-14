"use client";

import { useEffect, useRef } from "react";

export default function Home() {
  const preview = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const syncHash = () => {
      const frame = preview.current;
      if (!frame?.contentWindow || !window.location.hash) return;
      frame.contentWindow.location.hash = window.location.hash;
    };
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  return (
    <main className="min-h-dvh bg-[#f4f5f7] sm:px-4 sm:py-6">
      <iframe
        ref={preview}
        title="Homestay AI interactive prototype"
        src="/prototype.html"
        className="mx-auto block h-dvh w-full border-0 bg-white sm:h-[calc(100dvh-3rem)] sm:max-w-[450px] sm:rounded-[28px] sm:shadow-[0_18px_60px_rgba(18,24,32,0.1)]"
        onLoad={() => {
          const frame = preview.current;
          if (frame?.contentWindow && window.location.hash) {
            frame.contentWindow.location.hash = window.location.hash;
          }
        }}
      />
    </main>
  );
}
