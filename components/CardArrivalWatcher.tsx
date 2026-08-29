"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { publicPhotoUrl } from "@/lib/photos";
import type { CardProfile } from "@/types/database";

interface Arrival { id: string; created_at: string; scanned: CardProfile }

export function CardArrivalWatcher() {
  const since = useRef(new Date().toISOString());
  const [arrival, setArrival] = useState<Arrival>();
  useEffect(() => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/cards/latest?since=${encodeURIComponent(since.current)}`, { cache: "no-store" });
        if (!response.ok) return;
        const { card } = await response.json() as { card: Arrival | null };
        if (card) {
          since.current = card.created_at;
          setArrival(card);
        }
      } catch { /* 다음 폴링에서 재시도 */ }
    };
    const timer = window.setInterval(poll, 2_000);
    return () => window.clearInterval(timer);
  }, []);
  if (!arrival) return null;
  const photo = publicPhotoUrl(arrival.scanned.photo_path);
  return (
    <div className="sheet-scrim">
      <section className="sheet text-center">
        <span className="grabber block" />
        <p className="mt-3 text-sm font-bold text-acid">서로의 카드가 등록됐어요</p>
        <span className="mx-auto mt-4 grid h-32 w-32 place-items-center overflow-hidden rounded-full bg-cobalt">
          {photo ? (
            <img src={photo} alt={`${arrival.scanned.nickname}의 카드 사진`} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xl font-extrabold text-white">{arrival.scanned.mbti ?? "HELLO"}</span>
          )}
        </span>
        <h2 className="mt-4 text-[26px] font-extrabold tracking-tight">{arrival.scanned.nickname}</h2>
        <p className="mt-2 text-[15px] font-semibold text-white/60">{arrival.scanned.bio}</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button className="btn-ghost" onClick={() => setArrival(undefined)}>QR 계속 보여주기</button>
          <Link href="/card" className="btn-acid">카드 보기</Link>
        </div>
      </section>
    </div>
  );
}
