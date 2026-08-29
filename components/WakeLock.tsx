"use client";

import { useEffect } from "react";

export function WakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | undefined;
    const request = async () => {
      try { lock = await navigator.wakeLock?.request("screen"); } catch { /* 미지원 또는 권한 거부 */ }
    };
    void request();
    const onVisible = () => { if (document.visibilityState === "visible") void request(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { document.removeEventListener("visibilitychange", onVisible); void lock?.release(); };
  }, []);
  return null;
}
