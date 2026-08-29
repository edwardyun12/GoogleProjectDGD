"use client";

import { useEffect, useState } from "react";

function remainingSeconds(endsAt: string | null) {
  return endsAt ? Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 1000)) : 0;
}

export function Countdown({ endsAt, className = "" }: { endsAt: string | null; className?: string }) {
  const [seconds, setSeconds] = useState(() => remainingSeconds(endsAt));
  useEffect(() => {
    setSeconds(remainingSeconds(endsAt));
    const timer = window.setInterval(() => setSeconds(remainingSeconds(endsAt)), 1000);
    return () => window.clearInterval(timer);
  }, [endsAt]);
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const rest = (seconds % 60).toString().padStart(2, "0");
  return <time className={className} dateTime={`PT${seconds}S`}>{minutes}:{rest}</time>;
}
