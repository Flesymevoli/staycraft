"use client";
import {useEffect,useState,type ReactNode} from "react";
import {createPortal} from "react-dom";
import {useDesktopSurface} from "./desktop-surface";

/** Move the actual controls into the reference header without duplicating state. */
export function DesktopPageToolbar({children}:{children:ReactNode}) {
  const desktop=useDesktopSurface();
  const [slot,setSlot]=useState<HTMLElement|null>(null);
  useEffect(()=>{
    // Resolve the page-owned DOM slot after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlot(document.getElementById("desktop-page-toolbar"));
  },[]);
  return desktop&&slot?createPortal(children,slot):children;
}
