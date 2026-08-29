"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { addCard, type AddCardState } from "@/actions/cards";
import { QrScanner } from "@/components/QrScanner";
import { ChevronLeftIcon, ShirtIcon } from "@/components/icons";
import { publicPhotoUrl } from "@/lib/photos";

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
  const cardPhoto = publicPhotoUrl(state?.card?.photo_path);
  const corner = "absolute h-10 w-10 border-acid";

  return (
    <div className="relative min-h-dvh bg-ink">
      <QrScanner onScan={handle} frame={false} className="h-dvh w-full" />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 aspect-square w-[72%] -translate-x-1/2 -translate-y-1/2">
          <span className={`${corner} left-0 top-0 rounded-tl-lg border-l-[5px] border-t-[5px]`} />
          <span className={`${corner} right-0 top-0 rounded-tr-lg border-r-[5px] border-t-[5px]`} />
          <span className={`${corner} bottom-0 left-0 rounded-bl-lg border-b-[5px] border-l-[5px]`} />
          <span className={`${corner} bottom-0 right-0 rounded-br-lg border-b-[5px] border-r-[5px]`} />
        </div>
      </div>

      <Link href="/card" className="absolute left-4 top-6 z-10 flex items-center gap-1 rounded-full bg-black/60 px-3.5 py-2 text-sm font-bold text-white backdrop-blur">
        <ChevronLeftIcon className="h-4 w-4" />카드
      </Link>

      <p className="absolute inset-x-6 bottom-10 rounded-xl bg-black/70 px-4 py-3.5 text-center text-[15px] font-bold text-white backdrop-blur">
        {loading ? "카드를 추가하는 중…" : "상대의 QR을 네모 안에 맞춰주세요"}
      </p>

      {state?.card && (
        <div className="sheet-scrim">
          <section className="sheet text-center">
            <span className="grabber block" />
            <p className="mt-3 text-sm font-bold text-acid">서로의 카드가 등록됐어요</p>
            <span className="mx-auto mt-4 grid h-32 w-32 place-items-center overflow-hidden rounded-full bg-cobalt">
              {cardPhoto ? (
                <img src={cardPhoto} alt={`${state.card.nickname}의 카드 사진`} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl font-extrabold text-white">{state.card.mbti ?? "HELLO"}</span>
              )}
            </span>
            <h2 className="mt-4 text-[26px] font-extrabold tracking-tight">{state.card.nickname}</h2>
            <p className="mt-1 text-[15px] font-bold text-khaki">{[state.card.age_group, state.card.mbti].filter(Boolean).join(" · ")}</p>
            <p className="mt-3 text-[15px] font-semibold">{state.card.bio}</p>
            <p className="mt-4 flex items-center gap-2.5 rounded-xl border border-line bg-panelHi px-4 py-3 text-left text-sm font-semibold text-white/80">
              <ShirtIcon className="h-5 w-5 shrink-0 text-cobalt" />
              {state.card.appearance}
            </p>
            {state.duplicate && <p className="mt-3 text-sm font-bold text-acid">이미 있던 카드예요. 이번 교환은 미션 기록에 반영했어요.</p>}
            <Link href="/card" className="btn-acid mt-6 w-full">카드 목록 보기</Link>
          </section>
        </div>
      )}
      {state?.error && (
        <div className="absolute inset-x-5 top-20 z-20 rounded-xl border border-red-500/40 bg-red-500/15 p-4 text-center font-bold text-red-200 backdrop-blur">
          {state.error}
        </div>
      )}
    </div>
  );
}
