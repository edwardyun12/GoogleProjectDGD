"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { endParty, publishSurprise, startParty } from "@/actions/host";
import { Countdown } from "@/components/Countdown";
import type { Mission, PartyStatus } from "@/types/database";

interface Stats { mission: Mission | null; participantCount: number; cardCount: number }

export function HostDashboard({ partyId, initialStatus, initialStats, pendingMinutes }: { partyId: string; initialStatus: PartyStatus; initialStats: Stats; pendingMinutes: number }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [stats, setStats] = useState(initialStats);
  const [actionNotice, setActionNotice] = useState<string>();
  const [pending, startTransition] = useTransition();
  const [surpriseState, surpriseAction, surprisePending] = useActionState(publishSurprise.bind(null, partyId), {});

  useEffect(() => {
    if (status !== "running") return;
    const tick = async () => {
      try { const response = await fetch(`/api/party/${partyId}/tick`, { cache: "no-store" }); if (response.ok) setStats(await response.json()); } catch { /* 재시도 */ }
    };
    const timer = window.setInterval(tick, 5_000);
    return () => window.clearInterval(timer);
  }, [partyId, status]);
  useEffect(() => { if (surpriseState.ok) { setActionNotice(surpriseState.message); router.refresh(); } }, [router, surpriseState]);

  const run = (kind: "start" | "end") => startTransition(async () => {
    const response = kind === "start" ? await startParty(partyId) : await endParty(partyId);
    if (response.error) setActionNotice(response.error);
    else { setStatus(kind === "start" ? "running" : "ended"); setActionNotice(kind === "start" ? "파티를 시작했습니다." : "파티를 종료했습니다."); router.refresh(); }
  });

  return <div><section className="grid grid-cols-2 gap-3"><div className="card-panel"><p className="text-sm font-bold text-black/45">참가자</p><p className="mt-2 text-4xl font-black">{stats.participantCount}</p></div><div className="card-panel"><p className="text-sm font-bold text-black/45">카드 교환</p><p className="mt-2 text-4xl font-black">{stats.cardCount}</p></div></section><section className="mt-4 rounded-3xl bg-ink p-5 text-white"><div className="flex items-center justify-between"><p className="text-xs font-black tracking-widest text-lime">CURRENT MISSION</p>{stats.mission && <Countdown endsAt={stats.mission.ends_at} className="font-mono text-xl font-black text-lime" />}</div><h2 className="mt-4 text-2xl font-black">{stats.mission?.content ?? (status === "ready" ? "시작 전입니다" : status === "ended" ? "파티가 종료되었습니다" : "남은 미션이 없습니다")}</h2></section>{status === "ready" && <button className="btn-lime mt-4 w-full" disabled={pending} onClick={() => run("start")}>파티 시작</button>}{status === "running" && <><section className="card-panel mt-5"><h2 className="text-xl font-black">깜짝 미션 발행</h2><p className="mt-1 text-sm text-black/50">현재 미션을 즉시 종료하고 새 미션으로 대체합니다. 남은 시간표 약 {pendingMinutes}분은 그만큼 뒤로 밀려요.</p><form action={surpriseAction} className="mt-4 space-y-3"><input className="field" name="content" required maxLength={160} placeholder="지금 바로 할 미션" /><label><span className="label">제한 시간(분)</span><input className="field" name="duration" type="number" min="1" max="60" defaultValue="5" required /></label>{surpriseState.error && <p className="text-sm font-bold text-red-600">{surpriseState.error}</p>}<button className="btn-primary w-full" disabled={surprisePending}>즉시 발행</button></form></section><button className="mt-5 w-full rounded-2xl border border-red-200 bg-red-50 px-5 py-3 font-bold text-red-700" disabled={pending} onClick={() => run("end")}>파티 종료</button></>}{status === "ended" && <Link href={`/host/${partyId}/awards`} className="btn-lime mt-5 w-full">시상 결과 보기</Link>}{actionNotice && <p className="mt-4 rounded-2xl bg-white p-4 text-center text-sm font-bold">{actionNotice}</p>}</div>;
}
