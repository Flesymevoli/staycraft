"use client";
import {useSyncExternalStore} from "react";

const subscribe = () => () => {};
const client = () => Boolean(window.staycraftDesktop);
const server = () => false;

export function useDesktopSurface() {
  return useSyncExternalStore(subscribe, client, server);
}
