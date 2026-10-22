"use client";

import { useEffect, useSyncExternalStore } from "react";

type Language = "zh" | "en";
const key = "staycraft-operator-language";
const changed = "staycraft-operator-language-changed";
let fallback: Language = "zh";

function snapshot(): Language {
  try {
    const value = localStorage.getItem(key);
    if (value === "en" || value === "zh") return value;
  } catch { /* Storage may be unavailable; keep the current tab's choice. */ }
  return fallback;
}
function subscribe(notify: () => void) {
  const storage = (event: StorageEvent) => { if (event.key === key || event.key === null) notify(); };
  window.addEventListener("storage", storage);
  window.addEventListener(changed, notify);
  return () => { window.removeEventListener("storage", storage); window.removeEventListener(changed, notify); };
}
function setLanguage(value: Language) {
  fallback = value;
  try { localStorage.setItem(key, value); } catch { /* Language switching still works without persistence. */ }
  window.dispatchEvent(new Event(changed));
}
export function useOperatorLanguage() {
  const language = useSyncExternalStore(subscribe, snapshot, () => "zh" as Language);
  useEffect(() => { document.documentElement.lang = language === "zh" ? "zh-CN" : "en"; }, [language]);
  return { language, setLanguage };
}
