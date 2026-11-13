"use client";
import {createContext,useContext,useSyncExternalStore} from "react";

const subscribe = () => () => {};
const client = () => Boolean(window.staycraftDesktop);
const server = () => false;

export const DesktopTrialContext=createContext(false);
export const GuidedDemoContext=createContext(false);

export function useDesktopBridgeAvailable() {
  return useSyncExternalStore(subscribe, client, server);
}

export function useDesktopSurface() {
  const localTrial=useContext(DesktopTrialContext);
  const bridgeAvailable=useDesktopBridgeAvailable();
  return localTrial||bridgeAvailable;
}
