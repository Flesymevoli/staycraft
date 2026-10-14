"use client";

import { useCallback, useSyncExternalStore } from "react";

const eventName = "homestay-demo-state";
const prefix = "homestay-demo:";

export function useDemoStorage<T>(key: string, fallback: T): [T, (next: T | ((current: T) => T)) => void] {
  const subscribe = useCallback((notify: () => void) => {
    window.addEventListener(eventName, notify);
    window.addEventListener("storage", notify);
    return () => { window.removeEventListener(eventName, notify); window.removeEventListener("storage", notify); };
  }, []);
  const getSnapshot = useCallback(() => sessionStorage.getItem(prefix + key), [key]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null);
  let value = fallback;
  if (raw !== null) {
    try { value = JSON.parse(raw) as T; } catch { value = fallback; }
  }
  const setValue = useCallback((next: T | ((current: T) => T)) => {
    let current = fallback;
    const previous = sessionStorage.getItem(prefix + key);
    if (previous !== null) { try { current = JSON.parse(previous) as T; } catch { /* use fallback */ } }
    const resolved = typeof next === "function" ? (next as (current: T) => T)(current) : next;
    sessionStorage.setItem(prefix + key, JSON.stringify(resolved));
    window.dispatchEvent(new Event(eventName));
  }, [fallback, key]);
  return [value, setValue];
}
