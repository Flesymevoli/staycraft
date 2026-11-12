"use client";

import {useEffect, useRef, type ReactNode} from "react";
import {X} from "lucide-react";
import "./workbench-drawer.css";

export function WorkbenchDrawer({title, onClose, children, canClose}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  canClose?: () => boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      element?.close();
      document.body.style.overflow = overflow;
      trigger?.focus({preventScroll: true});
    };
  }, []);

  function dismiss() {
    if (closeTimer.current) return;
    if (canClose && !canClose()) return;
    dialog.current?.setAttribute("data-closing", "");
    closeTimer.current = setTimeout(onClose, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 220);
  }

  return <dialog ref={dialog} className="workbench-drawer" aria-labelledby="workbench-drawer-title"
    onCancel={event => { event.preventDefault(); dismiss(); }}
    onClick={event => { if (event.target === event.currentTarget) dismiss(); }}>
    <section className="workbench-drawer-panel">
      <header><h2 id="workbench-drawer-title">{title}</h2>
        <button type="button" aria-label="Close / 关闭" onClick={dismiss}><X size={18}/></button>
      </header>
      <div className="workbench-drawer-body">{children}</div>
    </section>
  </dialog>;
}
