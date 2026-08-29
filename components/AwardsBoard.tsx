"use client";

import { useState } from "react";
import { CardsIcon, CrownIcon, GiftIcon, HeartIcon, InfoIcon, UsersIcon } from "@/components/icons";

export interface AwardRow { id: string; nickname: string; photoUrl: string | null; cards: number; matching: number; general: number }

const TABS = [
  { key: "cards", label: "인맥 수", unit: "명" },
  { key: "matching", label: "매칭 성공", unit: "회" },
  { key: "general", label: "일반 미션", unit: "회" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const RANK_COLOR = ["text-acid", "text-white/70", "text-khaki"];

export function AwardsBoard({ rows, stats }: { rows: AwardRow[]; stats: { participants: number; cards: number; matching: number } }) {
  const [tab, setTab] = useState<TabKey>("cards");
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState(false);

  const active = TABS.find((item) => item.key === tab)!;
  const sorted = [...rows].sort((a, b) => b[tab] - a[tab] || b.cards - a.cards || a.nickname.localeCompare(b.nickname));
  const shown = showAll ? sorted : sorted.slice(0, 3);
  const winners = sorted.slice(0, 3);

  const copyWinners = async () => {
    const text = winners.map((person, index) => `${index + 1}위 ${person.nickname} — ${person[tab]}${active.unit}`).join("\n");
    try {
      await navigator.clipboard.writeText(`[${active.label}]\n${text}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* 클립보드를 쓸 수 없는 브라우저 */ }
  };

  return (
    <div>
      <section className="panel flex items-stretch px-2 py-4">
        {[
          { label: "참가자", value: `${stats.participants}명`, Icon: UsersIcon },
          { label: "인맥 카드", value: `${stats.cards}장`, Icon: CardsIcon },
          { label: "매칭 성공", value: `${stats.matching}회`, Icon: HeartIcon },
        ].map(({ label, value, Icon }, index) => (
          <div key={label} className={`flex-1 text-center ${index ? "border-l border-white/12" : ""}`}>
            <p className="text-[13px] font-semibold text-white/45">{label}</p>
            <p className="mt-1.5 text-[26px] font-extrabold leading-none">{value}</p>
            <Icon className="mx-auto mt-2.5 h-5 w-5 text-acid" />
          </div>
        ))}
      </section>

      <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-xl border border-line bg-panel">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`py-3.5 text-[15px] font-bold transition ${tab === item.key ? "bg-acid text-black" : "text-white/55"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <ol className="panel mt-3 overflow-hidden">
        {shown.map((person, index) => (
          <li key={person.id} className="flex items-center border-t border-khaki/12 first:border-t-0">
            <span className={`grid w-14 shrink-0 place-items-center self-stretch py-4 ${index === 0 ? "bg-acid/10" : ""}`}>
              {index === 0 && <CrownIcon className="mb-0.5 h-4 w-4 text-acid" />}
              <span className={`text-[17px] font-extrabold ${RANK_COLOR[index] ?? "text-white/40"}`}>{index + 1}</span>
            </span>
            <span className="ml-3 grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10">
              {person.photoUrl ? (
                <img src={person.photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-extrabold text-white/50">{person.nickname.slice(0, 1)}</span>
              )}
            </span>
            <span className="ml-3 min-w-0 flex-1 truncate text-[17px] font-extrabold">{person.nickname}</span>
            <span className={`px-4 text-[19px] font-extrabold ${index === 0 ? "text-acid" : "text-white"}`}>
              {person[tab]}{active.unit}
            </span>
          </li>
        ))}
        {!shown.length && <li className="px-4 py-8 text-center text-[15px] font-semibold text-white/40">아직 집계할 기록이 없어요.</li>}
      </ol>

      <p className="mt-3 flex items-center gap-2 px-1 text-[13px] font-semibold text-white/40">
        <InfoIcon className="h-4 w-4 shrink-0" />
        일반 미션은 자기 신고라 시상 점수에 낮은 가중치로 반영돼요
      </p>

      <div className="hair mt-6" />
      <h2 className="mt-6 text-[19px] font-extrabold">베네핏 지급</h2>
      <div className="panel mt-3 flex items-center gap-3 px-4 py-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/5 text-acid"><GiftIcon className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold">다음 행사 우선 초대</span>
          <span className="block truncate text-[13px] text-white/45">{winners.map((person) => person.nickname).join(" · ") || "수상자 없음"}</span>
        </span>
        <span className="shrink-0 text-[15px] font-extrabold text-acid">{winners.length}명</span>
      </div>

      <button type="button" className="btn-acid mt-3 w-full" onClick={copyWinners} disabled={!winners.length}>
        <GiftIcon className="h-5 w-5" />
        {copied ? "명단을 복사했어요" : "수상자 명단 복사"}
      </button>
      <button type="button" className="btn-outline mt-3 w-full" onClick={() => setShowAll((current) => !current)}>
        {showAll ? "상위 3명만 보기" : "전체 결과 보기"}
      </button>
    </div>
  );
}
