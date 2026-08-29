"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { addCard, type AddCardState } from "@/actions/cards";
import { QrScanner } from "@/components/QrScanner";

function extractToken(raw: string) {
  try { return new URL(raw).searchParams.get("c"); } catch { return null; }
}

export function ScanExperience({ initialToken }: { initialToken?: string }) {
  const [state, setState] = useState<AddCardState>();
  const [loading, setLoading] = useState(false);
  const handled = useRef(false);
  const handle = useCallback(async (raw: string) => {
    if (handled.current) return;
    const token = raw.includes("://") ? extractToken(raw) : raw;
    if (!token) { setState({ error: "인맥 카드용 QR이 아닙니다." }); return; }
    handled.current = true;
    setLoading(true);
    const result = await addCard(token);
    setState(result);
    setLoading(false);
    if (result.error) handled.current = false;
  }, []);
  useEffect(() => { if (initialToken) void handle(initialToken); }, [handle, initialToken]);

  return (
    <div className="relative min-h-dvh bg-ink">
      <QrScanner onScan={handle} className="h-dvh w-full rounded-none" />
      <Link href="/card" className="absolute left-5 top-5 z-10 rounded-full bg-black/60 px-4 py-2 font-bold text-white">← 카드</Link>
      <p className="absolute inset-x-6 bottom-8 rounded-2xl bg-black/65 p-4 text-center font-bold text-white">{loading ? "카드를 추가하는 중…" : "상대방의 QR을 네모 안에 맞춰 주세요"}</p>
      {state?.card && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-black/70 p-5">
          <section className="card-panel w-full max-w-sm text-center">
            <span className="text-5xl">🎉</span><h2 className="mt-4 text-3xl font-black">{state.card.nickname}</h2>
            <p className="mt-2 text-black/55">{[state.card.age && `${state.card.age}세`, state.card.gender, state.card.mbti].filter(Boolean).join(" · ")}</p>
            <p className="mt-4 rounded-2xl bg-paper p-4 font-semibold">{state.card.appearance}</p>
            {state.duplicate && <p className="mt-3 text-sm font-bold text-violet">이미 추가한 카드예요.</p>}
            <Link href="/card" className="btn-primary mt-6 w-full">카드 목록 보기</Link>
          </section>
        </div>
      )}
      {state?.error && <div className="absolute inset-x-5 top-20 z-20 rounded-2xl bg-red-600 p-4 text-center font-bold text-white">{state.error}</div>}
    </div>
  );
}
