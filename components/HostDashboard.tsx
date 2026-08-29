"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { endParty, publishSurprise, startParty } from "@/actions/host";
import { Countdown } from "@/components/Countdown";
import {
  ChevronRightIcon, ClockIcon, CloseIcon, ExchangeIcon, GiftIcon, InfoIcon,
  PersonPlusIcon, TargetIcon, TrophyIcon, UsersIcon,
} from "@/components/icons";
import type { MissionView, PartyStatus } from "@/types/database";

export interface ActivityItem { id: string; kind: "exchange" | "join"; text: string; at: string }
interface Stats { missions: MissionView[]; participantCount: number; exchangeCount: number; matchingRate: number | null }

function timeAgo(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  return `${Math.floor(minutes / 60)}시간 전`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 text-center">
      <p className="text-[13px] font-semibold text-white/45">{label}</p>
      <p className="mt-1.5 text-[28px] font-extrabold leading-none text-acid">{value}</p>
    </div>
  );
}

export function HostDashboard({
  partyId,
  initialStatus,
  initialStats,
  activity,
}: {
  partyId: string;
  initialStatus: PartyStatus;
  initialStats: Stats;
  activity: ActivityItem[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [stats, setStats] = useState(initialStats);
  const [notice, setNotice] = useState<string>();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [surpriseState, surpriseAction, surprisePending] = useActionState(publishSurprise.bind(null, partyId), {});

  useEffect(() => {
    if (status !== "running") return;
    let ticks = 0;
    const tick = async () => {
      try {
        const response = await fetch(`/api/party/${partyId}/tick`, { cache: "no-store" });
        if (response.ok) {
          const next = await response.json();
          setStats({
            missions: next.missions ?? [],
            participantCount: next.participantCount ?? 0,
            exchangeCount: next.exchangeCount ?? 0,
            matchingRate: next.matchingRate ?? null,
          });
        }
      } catch { /* 다음 폴링에서 재시도 */ }
      ticks += 1;
      if (ticks % 3 === 0) router.refresh(); // 최근 활동 목록 갱신
    };
    const timer = window.setInterval(tick, 5_000);
    return () => window.clearInterval(timer);
  }, [partyId, router, status]);

  useEffect(() => {
    if (surpriseState.ok) {
      setNotice(surpriseState.message);
      setSheetOpen(false);
      router.refresh();
    }
  }, [router, surpriseState]);

  const run = (kind: "start" | "end") => startTransition(async () => {
    const response = kind === "start" ? await startParty(partyId) : await endParty(partyId);
    if (response.error) setNotice(response.error);
    else {
      setStatus(kind === "start" ? "running" : "ended");
      setNotice(kind === "start" ? "파티를 시작했습니다." : "파티를 종료했습니다.");
      router.refresh();
    }
  });

  return (
    <div>
      <section className="panel flex items-stretch px-2 py-4">
        <Stat label="참가자" value={`${stats.participantCount}명`} />
        <span className="w-px self-stretch bg-white/12" />
        <Stat label="총 교환" value={`${stats.exchangeCount}회`} />
        <span className="w-px self-stretch bg-white/12" />
        <Stat label="매칭 성공률" value={stats.matchingRate === null ? "—" : `${stats.matchingRate}%`} />
      </section>

      <div className="mt-3 space-y-3">
        {stats.missions.length ? stats.missions.map((view) => {
          const surprise = view.mission.kind === "surprise";
          const total = view.total ?? 0;
          return (
            <section key={view.mission.id} className="panel px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <span className={`badge ${surprise ? "bg-cobalt text-white" : "bg-khaki text-black"}`}>{surprise ? "병행 중" : "현재 미션"}</span>
                  <h2 className="mt-2.5 text-[22px] font-extrabold leading-tight tracking-tight">{view.mission.content}</h2>
                  <p className="mt-2 flex items-center gap-1.5 text-acid">
                    <ClockIcon className="h-4 w-4" />
                    <Countdown endsAt={view.mission.ends_at} className="tabnum text-[17px] font-extrabold" />
                  </p>
                </div>
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white/5 text-cobalt">
                  {surprise ? <GiftIcon className="h-8 w-8" /> : view.mission.judge_type === "matching" ? <TargetIcon className="h-8 w-8" /> : <UsersIcon className="h-8 w-8" />}
                </span>
              </div>
              {total > 0 && (
                <div className="mt-4">
                  <p className="text-[15px] font-bold">
                    <span className="text-acid">{view.progress}</span>
                    <span className="text-white/45"> / {total}명 성공</span>
                  </p>
                  <span className="mt-2 block h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <span className="block h-full rounded-full bg-acid" style={{ width: `${Math.min(100, Math.round((view.progress / total) * 100))}%` }} />
                  </span>
                </div>
              )}
            </section>
          );
        }) : (
          <section className="panel px-4 py-5">
            <span className="badge bg-white/10 text-white/60">현재 미션</span>
            <h2 className="mt-2.5 text-[20px] font-extrabold">
              {status === "ready" ? "아직 시작 전이에요" : status === "ended" ? "파티가 종료되었어요" : "남은 미션이 없어요"}
            </h2>
          </section>
        )}
      </div>

      {status === "ready" && <button className="btn-acid mt-4 w-full" disabled={pending} onClick={() => run("start")}>파티 시작</button>}

      {status === "running" && (
        <>
          <button className="btn-acid mt-4 w-full" onClick={() => setSheetOpen(true)}>
            <GiftIcon className="h-5 w-5" />깜짝 미션 발행
          </button>
          <p className="mt-2.5 flex items-center gap-2 px-1 text-[13px] font-semibold text-white/40">
            <InfoIcon className="h-4 w-4 shrink-0" />
            기존 시간표는 그대로 진행돼요
            <ChevronRightIcon className="ml-auto h-4 w-4" />
          </p>
        </>
      )}

      {status === "ended" && <Link href={`/host/${partyId}/awards`} className="btn-acid mt-4 w-full"><TrophyIcon className="h-5 w-5" />시상 결과 보기</Link>}

      <section className="panel mt-4 px-4 py-4">
        <p className="text-[15px] font-bold">최근 활동</p>
        <ul className="mt-1.5">
          {activity.length ? activity.map((item) => (
            <li key={item.id} className="flex items-center gap-3 border-t border-khaki/12 py-3 first:border-t-0">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/5 text-acid">
                {item.kind === "exchange" ? <ExchangeIcon className="h-5 w-5" /> : <PersonPlusIcon className="h-5 w-5" />}
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{item.text}</span>
              <span className="shrink-0 text-[13px] text-white/35">{timeAgo(item.at)}</span>
            </li>
          )) : <li className="py-4 text-[15px] font-semibold text-white/40">아직 활동이 없어요.</li>}
        </ul>
      </section>

      {status === "running" && (
        <button className="btn-quiet mt-3 w-full text-red-400/80" disabled={pending} onClick={() => run("end")}>파티 종료</button>
      )}
      {notice && <p className="mt-3 rounded-xl border border-line bg-panelHi px-4 py-3 text-center text-sm font-bold">{notice}</p>}

      {sheetOpen && (
        <div className="sheet-scrim">
          <section className="sheet">
            <span className="grabber block" />
            <div className="relative flex items-center justify-center py-1">
              <p className="text-[15px] font-bold text-white/80">깜짝 미션 발행</p>
              <button onClick={() => setSheetOpen(false)} className="absolute right-0 text-white/70" aria-label="닫기"><CloseIcon className="h-6 w-6" /></button>
            </div>
            <p className="mt-2 text-center text-sm text-white/45">현재 미션과 병행해 즉시 발행됩니다</p>
            <form action={surpriseAction} className="mt-6 space-y-4">
              <div>
                <span className="label">종류</span>
                <div className="grid grid-cols-2 gap-2">
                  {[{ value: "self", label: "일반 미션" }, { value: "matching", label: "매칭 미션" }].map((option, index) => (
                    <label key={option.value} className="block">
                      <input type="radio" name="judgeType" value={option.value} defaultChecked={index === 0} className="peer sr-only" required />
                      <span className="chip w-full peer-checked:border-acid peer-checked:bg-acid peer-checked:font-bold peer-checked:text-black">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="block"><span className="label">미션 내용</span><input className="field" name="content" required maxLength={160} placeholder="지금 바로 할 미션" /></label>
              <label className="block"><span className="label">제한 시간(분)</span><input className="field" name="duration" type="number" min="1" max="60" defaultValue="5" required /></label>
              {surpriseState.error && <p className="text-sm font-bold text-red-400">{surpriseState.error}</p>}
              <button className="btn-acid w-full" disabled={surprisePending}>{surprisePending ? "발행 중…" : "즉시 발행"}</button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
