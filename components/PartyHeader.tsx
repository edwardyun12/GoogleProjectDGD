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
  return (
    <section className="relative z-10">
      <p className="text-[21px] font-extrabold leading-[1.5] tracking-tight">{message}</p>
      <p className="text-[21px] font-extrabold leading-[1.5] tracking-tight">
        지금 <span className="text-acid">{count}명</span>이 파티에 참여해 있어요
      </p>
    </section>
  );
}
