"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { reportMission } from "@/actions/missions";
import { Countdown } from "@/components/Countdown";
import { getBrowserClient } from "@/lib/supabase-browser";
import type { Mission } from "@/types/database";

interface TickPayload {
  mission: Mission | null;
  result: "success" | "fail" | null;
  progress: number;
}

export function MissionExperience({ partyId, initial }: { partyId: string; initial: TickPayload }) {
  const [data, setData] = useState(initial);
  const [open, setOpen] = useState(Boolean(initial.mission));
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  const lastMissionId = useRef(initial.mission?.id);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/party/${partyId}/tick`, { cache: "no-store" });
      if (!response.ok) return;
      const next = await response.json() as TickPayload;
      if (next.mission?.id && next.mission.id !== lastMissionId.current) {
        lastMissionId.current = next.mission.id;
        setOpen(true);
      }
      setData(next);
    } catch {
      // Realtime 장애 시 다음 폴링에서 다시 시도한다.
    }
  }, [partyId]);

  useEffect(() => {
    const interval = window.setInterval(refresh, 10_000);
    const supabase = getBrowserClient();
    const channel = supabase
      ?.channel(`missions:${partyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "missions", filter: `party_id=eq.${partyId}` }, refresh)
      .subscribe();
    return () => {
      window.clearInterval(interval);
      if (supabase && channel) void supabase.removeChannel(channel);
    };
  }, [partyId, refresh]);

  const submit = (result: "success" | "fail") => {
    if (!data.mission) return;
    setMessage(undefined);
    startTransition(async () => {
      const response = await reportMission(data.mission!.id, result);
      if (response.error) setMessage(response.error);
      else {
        setData((current) => ({ ...current, result }));
        setMessage("응답을 저장했어요.");
      }
    });
  };

  return (
    <>
      <section className="rounded-3xl bg-ink p-5 text-white">
        <div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-[.2em] text-lime">Now mission</span>{data.mission && <Countdown endsAt={data.mission.ends_at} className="font-mono text-lg font-black text-lime" />}</div>
        {data.mission ? (
          <><h2 className="mt-4 text-2xl font-black leading-snug">{data.mission.content}</h2><button onClick={() => setOpen(true)} className="mt-5 rounded-xl bg-white px-4 py-2 text-sm font-bold text-ink">미션 열기</button></>
        ) : <p className="mt-4 text-lg font-bold text-white/70">다음 미션을 기다리는 중이에요.</p>}
      </section>

      {open && data.mission && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 sm:items-center sm:p-5">
          <section className="w-full max-w-md rounded-t-[2rem] bg-paper p-6 sm:rounded-[2rem]">
            <div className="flex items-start justify-between gap-4"><span className="rounded-full bg-lime px-3 py-1 text-xs font-black">MISSION</span><button onClick={() => setOpen(false)} className="text-2xl leading-none text-black/50" aria-label="닫기">×</button></div>
            <h2 className="mt-8 text-center text-3xl font-black leading-tight">{data.mission.content}</h2>
            <Countdown endsAt={data.mission.ends_at} className="mt-5 block text-center font-mono text-5xl font-black text-violet" />
            <div className="mt-10">
              {data.mission.judge_type === "auto_cards" ? (
                <div className="rounded-2xl bg-white p-5 text-center"><p className="text-sm font-bold text-black/50">인맥 카드 진행도</p><p className="mt-2 text-4xl font-black">{data.progress} / {data.mission.auto_target}</p><p className="mt-2 text-sm text-black/50">QR을 스캔하면 자동으로 반영돼요.</p></div>
              ) : data.result ? (
                <div className="rounded-2xl bg-white p-5 text-center font-bold">{data.result === "success" ? "성공으로 응답했어요 🎉" : "실패로 응답했어요. 다음 미션에 도전해요!"}</div>
              ) : (
                <div className="grid grid-cols-2 gap-3"><button className="btn-lime" disabled={pending} onClick={() => submit("success")}>성공</button><button className="btn-secondary" disabled={pending} onClick={() => submit("fail")}>실패</button></div>
              )}
              {message && <p className="mt-3 text-center text-sm font-semibold">{message}</p>}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
