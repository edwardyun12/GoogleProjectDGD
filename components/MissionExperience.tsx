"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { reportMission } from "@/actions/missions";
import { Countdown } from "@/components/Countdown";
import { ChevronRightIcon, ClockIcon, CloseIcon, GiftIcon, QrGlyph, ShirtIcon, TargetIcon, TrophyIcon, UsersIcon } from "@/components/icons";
import { publicPhotoUrl } from "@/lib/photos";
import { getBrowserClient } from "@/lib/supabase-browser";
import type { CardProfile, Mission, MissionView } from "@/types/database";

interface TickPayload { missions: MissionView[] }

function missionLabel(mission: Mission) {
  if (mission.kind === "surprise") return "깜짝 미션";
  return mission.judge_type === "matching" ? "매칭 미션" : "진행 중인 미션";
}

function MissionIcon({ mission, className }: { mission: Mission; className?: string }) {
  if (mission.kind === "surprise") return <GiftIcon className={className} />;
  return mission.judge_type === "matching" ? <TargetIcon className={className} /> : <TrophyIcon className={className} />;
}

export function MissionExperience({ partyId, initial }: { partyId: string; initial: TickPayload }) {
  const [data, setData] = useState(initial);
  const [openId, setOpenId] = useState<string | null>(initial.missions[0]?.mission.id ?? null);
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const knownIds = useRef(new Set(initial.missions.map((view) => view.mission.id)));

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/party/${partyId}/tick`, { cache: "no-store" });
      if (!response.ok) return;
      const next = await response.json() as TickPayload;
      const newMission = next.missions.find((view) => !knownIds.current.has(view.mission.id));
      next.missions.forEach((view) => knownIds.current.add(view.mission.id));
      if (newMission) setOpenId(newMission.mission.id);
      setData({ missions: next.missions });
    } catch { /* 다음 폴링에서 재시도 */ }
  }, [partyId]);

  useEffect(() => {
    const timer = window.setInterval(refresh, 10_000);
    const supabase = getBrowserClient();
    const channel = supabase?.channel(`missions:${partyId}`).on(
      "postgres_changes",
      { event: "*", schema: "public", table: "missions", filter: `party_id=eq.${partyId}` },
      refresh,
    ).subscribe();
    return () => {
      window.clearInterval(timer);
      if (supabase && channel) void supabase.removeChannel(channel);
    };
  }, [partyId, refresh]);

  const selected = data.missions.find((view) => view.mission.id === openId) ?? null;
  const submit = (missionId: string, result: "success" | "fail") => startTransition(async () => {
    setMessage(undefined);
    const response = await reportMission(missionId, result);
    if (response.error) setMessage(response.error);
    else {
      setData((current) => ({ missions: current.missions.map((view) => view.mission.id === missionId ? { ...view, result } : view) }));
      setMessage("응답을 저장했어요.");
    }
  });

  return (
    <>
      {data.missions.length ? (
        <div className="space-y-3">
          {data.missions.map((view) => (
            <section key={view.mission.id} className="panel px-4 py-3.5">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2.5 text-sm font-bold text-acid">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-acid/12 text-acid">
                    <MissionIcon mission={view.mission} className="h-4 w-4" />
                  </span>
                  {missionLabel(view.mission)}
                </p>
                <p className="flex items-center gap-1.5 text-acid">
                  <ClockIcon className="h-4 w-4" />
                  <Countdown endsAt={view.mission.ends_at} className="tabnum text-[17px] font-extrabold" />
                </p>
              </div>
              <div className="hair my-3.5" />
              <div className="flex items-start gap-4">
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white/5 text-cobalt">
                  <MissionIcon mission={view.mission} className="h-8 w-8" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[19px] font-extrabold leading-[1.45]">{view.mission.content}</h2>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => { setMessage(undefined); setOpenId(view.mission.id); }}
                      className="inline-flex items-center gap-1 rounded-lg bg-acid px-4 py-2.5 text-sm font-extrabold text-black"
                    >
                      미션 보기
                      <ChevronRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <section className="panel px-4 py-5">
          <p className="flex items-center gap-2.5 text-sm font-bold text-white/45">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/5"><TrophyIcon className="h-4 w-4" /></span>
            진행 중인 미션
          </p>
          <p className="mt-3 text-[17px] font-bold text-white/70">다음 미션을 기다리는 중이에요</p>
        </section>
      )}

      {selected && (
        <div className="sheet-scrim">
          <section className="sheet">
            <span className="grabber block" />
            <div className="relative flex items-center justify-center py-1">
              <p className="text-[15px] font-bold text-white/80">{missionLabel(selected.mission)}</p>
              <button onClick={() => setOpenId(null)} className="absolute right-0 text-white/70" aria-label="닫기">
                <CloseIcon className="h-6 w-6" />
              </button>
            </div>
            {selected.mission.kind === "surprise" && (
              <p className="mt-2 flex justify-center">
                <span className="badge rounded-full border border-acid/70 px-3.5 py-1.5 text-acid">깜짝 미션</span>
              </p>
            )}
            <div className="hair mt-3" />
            <p className="flex items-center justify-center gap-2.5 py-4 text-acid">
              <ClockIcon className="h-7 w-7" />
              <Countdown endsAt={selected.mission.ends_at} className="tabnum text-[38px] font-extrabold leading-none" />
            </p>
            <div className="hair" />
            <h2 className="mt-6 text-center text-[24px] font-extrabold leading-[1.4] tracking-tight">{selected.mission.content}</h2>

            {selected.mission.judge_type === "matching" ? (
              <MatchingPanel view={selected} />
            ) : (
              <div className="mt-7">
                {selected.result ? (
                  <p className={`rounded-xl px-4 py-4 text-center text-[15px] font-bold ${selected.result === "success" ? "bg-acid text-black" : "border border-line bg-panelHi text-white/70"}`}>
                    {selected.result === "success" ? "성공으로 응답했어요" : "실패로 응답했어요. 다음 미션에 도전해요!"}
                  </p>
                ) : (
                  <>
                    <p className="mb-3 text-center text-sm text-white/45">완료한 뒤 결과를 직접 선택해주세요</p>
                    <div className="grid grid-cols-2 gap-3">
                      <button className="btn-outline" disabled={pending} onClick={() => submit(selected.mission.id, "fail")}>실패</button>
                      <button className="btn-acid" disabled={pending} onClick={() => submit(selected.mission.id, "success")}>성공</button>
                    </div>
                  </>
                )}
                {message && <p className="mt-3 text-center text-sm font-semibold text-white/60">{message}</p>}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function MatchingPanel({ view }: { view: MissionView }) {
  if (view.isBye) {
    return (
      <div className="mt-7 rounded-xl border border-line bg-panelHi px-4 py-6 text-center">
        <p className="text-[17px] font-extrabold">이번 매칭 대상이 없어요</p>
        <p className="mt-2 text-sm leading-6 text-white/45">사진을 등록한 참가자가 홀수이거나 부족하면 매칭에서 빠질 수 있어요.</p>
      </div>
    );
  }
  return (
    <div className="mt-6 space-y-6">
      {view.matches.map((match) => <MatchCard key={match.id} match={match} />)}
      {view.result === "success" ? (
        <p className="rounded-xl bg-acid px-4 py-4 text-center text-[15px] font-extrabold text-black">모든 상대와 카드 교환 성공</p>
      ) : (
        <p className="flex items-center gap-2.5 rounded-xl bg-khaki px-4 py-3.5 text-[14px] font-bold text-black">
          <UsersIcon className="h-5 w-5 shrink-0" />
          카드를 교환하면 자동으로 성공 처리돼요
        </p>
      )}
      <Link href="/my_qr" className="btn-acid w-full">
        <QrGlyph className="h-5 w-5" />
        내 QR 바로 열기
      </Link>
    </div>
  );
}

function MatchCard({ match }: { match: CardProfile }) {
  const photo = publicPhotoUrl(match.photo_path);
  const tags = match.appearance_tags?.length ? match.appearance_tags.join(" · ") : match.appearance;
  return (
    <div>
      <div className="mx-auto grid h-52 w-52 place-items-center overflow-hidden rounded-full bg-cobalt">
        {photo ? (
          <img src={photo} alt={`${match.nickname}의 카드 사진`} className="h-full w-full object-cover" />
        ) : (
          <span className="text-3xl font-extrabold text-white">{match.mbti ?? "HELLO"}</span>
        )}
      </div>
      <h3 className="mt-4 text-center text-[26px] font-extrabold tracking-tight">{match.nickname}</h3>
      <p className="mt-1 text-center text-[15px] font-bold text-khaki">{[match.age_group, match.mbti].filter(Boolean).join(" · ")}</p>
      <div className="mt-5 flex items-center gap-3 rounded-xl border border-line bg-panelHi px-4 py-3.5">
        <ShirtIcon className="h-7 w-7 shrink-0 text-cobalt" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white/40">오늘의 인상착의</p>
          <p className="mt-0.5 text-[15px] font-bold">{tags}</p>
        </div>
      </div>
    </div>
  );
}
