"use client";

import { useEffect, useState } from "react";

export function PartyHeader({ partyId, message, initialCount }: { partyId: string; message: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  useEffect(() => {
    const refresh = async () => {
      try {
        const response = await fetch(`/api/party/${partyId}/tick`, { cache: "no-store" });
        if (response.ok) setCount((await response.json()).participantCount ?? 0);
      } catch { /* 다음 폴링에서 재시도 */ }
    };
    const timer = window.setInterval(refresh, 10_000);
    return () => window.clearInterval(timer);
  }, [partyId]);
  return <section className="rounded-3xl bg-lime p-5"><p className="font-semibold">{message}</p><p className="mt-2 text-2xl font-black">지금 {count}명이<br />파티에 참여해 있어요</p></section>;
}
