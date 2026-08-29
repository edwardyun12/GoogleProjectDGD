"use client";

import { useState } from "react";
import { AppBar } from "@/components/AppBar";
import { CardArrivalWatcher } from "@/components/CardArrivalWatcher";
import { Decor } from "@/components/Decor";
import { QrDisplay } from "@/components/QrDisplay";
import { SunIcon } from "@/components/icons";
import { WakeLock } from "@/components/WakeLock";

export function MyQrView({ url, nickname, meta, photoUrl }: { url: string; nickname: string; meta: string; photoUrl: string | null }) {
  const [boost, setBoost] = useState(false);
  return (
    <main className="shell pad-b">
      <WakeLock />
      <CardArrivalWatcher />
      {!boost && <Decor variant="quiet" />}
      <AppBar title="내 QR" backHref="/home" />
      <div className="pad relative z-10">
        <div className={`mx-auto transition-all ${boost ? "w-full" : "w-[72%]"}`}>
          <QrDisplay value={url} alt={`${nickname}님의 인맥 카드 QR`} className={boost ? "shadow-[0_0_60px_rgba(255,255,255,0.25)]" : ""} />
        </div>

        <div className="mt-7 flex items-center justify-center gap-3">
          <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10">
            {photoUrl ? (
              <img src={photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-extrabold text-white/60">ME</span>
            )}
          </span>
          <div>
            <p className="text-[22px] font-extrabold leading-tight tracking-tight">{nickname}</p>
            <p className="text-[15px] font-bold text-khaki">{meta}</p>
          </div>
        </div>

        <h2 className="mt-8 text-center text-[28px] font-extrabold tracking-tight">
          제 <span className="text-acid">프로필 추가</span>하세요
        </h2>
        <p className="mt-2 text-center text-[15px] leading-6 text-white/50">한 번만 스캔하면 서로의 카드가<br />동시에 추가돼요</p>

        <p className="mt-8 flex items-center justify-center gap-2.5 text-[15px] font-bold text-acid">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-acid shadow-glow" />
          상대 카드를 기다리고 있어요
        </p>

        <button type="button" onClick={() => setBoost((current) => !current)} className={`btn-ghost mt-6 w-full ${boost ? "border-acid/70 text-acid" : ""}`}>
          <SunIcon className="h-5 w-5" />
          {boost ? "원래 크기로" : "밝기 최대로"}
        </button>
      </div>
    </main>
  );
}
