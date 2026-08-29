"use client";

import { useEffect, useState, useTransition } from "react";
import { saveMissionSchedule } from "@/actions/host";
import { CalendarIcon, ChevronLeftIcon, ClockIcon, PlusIcon, TrashIcon, WarningIcon } from "@/components/icons";
import type { Mission, MissionJudge } from "@/types/database";

interface Row {
  key: string;
  content: string;
  durationSec: number;
  judgeType: Extract<MissionJudge, "self" | "matching">;
  autoTarget: null;
}

const planKey = (partyId: string) => `htb:party-plan:${partyId}`;

export function MissionEditor({ partyId, missions, locked }: { partyId: string; missions: Mission[]; locked: boolean }) {
  const [rows, setRows] = useState<Row[]>(missions.map((mission) => ({
    key: mission.id,
    content: mission.content,
    durationSec: mission.duration_sec,
    judgeType: mission.judge_type === "matching" ? "matching" : "self",
    autoTarget: null,
  })));
  const [plannedMinutes, setPlannedMinutes] = useState(90);
  const [notice, setNotice] = useState<{ error?: string; message?: string }>({});
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const saved = Number(window.localStorage.getItem(planKey(partyId)));
    if (saved > 0) setPlannedMinutes(saved);
  }, [partyId]);

  const setPlan = (value: number) => {
    const next = Math.min(600, Math.max(10, value || 0));
    setPlannedMinutes(next);
    try { window.localStorage.setItem(planKey(partyId), String(next)); } catch { /* 저장 불가 브라우저 */ }
  };

  const totalMinutes = Math.round(rows.reduce((sum, row) => sum + row.durationSec, 0) / 60);
  const over = totalMinutes - plannedMinutes;
  const update = (index: number, value: Partial<Row>) => setRows((current) => current.map((row, i) => i === index ? { ...row, ...value } : row));
  const move = (index: number, offset: number) => setRows((current) => {
    const next = [...current];
    const target = index + offset;
    if (target < 0 || target >= next.length) return current;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  const save = () => startTransition(async () => {
    setNotice({});
    setNotice(await saveMissionSchedule(partyId, rows.map(({ content, durationSec, judgeType, autoTarget }) => ({ content, durationSec, judgeType, autoTarget }))));
  });

  return (
    <div>
      <section className="panel flex items-stretch px-4 py-4">
        <div className="flex-1 text-center">
          <p className="text-sm font-semibold text-white/45">예정 시간</p>
          <p className="mt-1 flex items-baseline justify-center gap-1">
            <input
              className="w-16 bg-transparent text-center text-[30px] font-extrabold outline-none"
              type="number"
              min={10}
              max={600}
              step={5}
              value={plannedMinutes}
              onChange={(event) => setPlan(Number(event.target.value))}
              aria-label="파티 예정 시간(분)"
            />
            <span className="text-[22px] font-extrabold">분</span>
          </p>
        </div>
        <span className="w-px self-stretch bg-white/12" />
        <div className="flex-1 text-center">
          <p className="text-sm font-semibold text-white/45">미션 합계</p>
          <p className="mt-1 text-[30px] font-extrabold leading-none">
            {totalMinutes}<span className="text-[22px]">분</span>
          </p>
        </div>
      </section>

      {over > 0 && (
        <p className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-acid/40 bg-acid/10 px-4 py-3 text-sm font-bold text-acid">
          <WarningIcon className="h-5 w-5" />
          파티 예정 시간을 {over}분 초과했어요
        </p>
      )}
      {locked && (
        <p className="mt-3 rounded-xl border border-line bg-panelHi px-4 py-3 text-sm font-bold text-white/60">
          파티가 시작된 뒤에는 시간표를 수정할 수 없습니다.
        </p>
      )}

      <div className="mt-5">
        {rows.map((row, index) => {
          const last = index === rows.length - 1;
          const startAt = Math.round(rows.slice(0, index + 1).reduce((sum, item) => sum + item.durationSec, 0) / 60);
          return (
            <div key={row.key} className="flex items-stretch gap-3.5">
              <div className="flex w-8 shrink-0 flex-col items-center">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-acid text-sm font-extrabold text-acid">{index + 1}</span>
                {!last && (
                  <>
                    <span className="my-1.5 w-px flex-1 bg-white/15" />
                    <span className="pb-4 text-[11px] font-bold text-khaki">{startAt}분</span>
                  </>
                )}
              </div>
              <section className="panel mb-3 flex-1 px-4 py-3.5">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => update(index, { judgeType: row.judgeType === "matching" ? "self" : "matching" })}
                    className={`badge ${row.judgeType === "matching" ? "bg-cobalt text-white" : "bg-khaki text-black"}`}
                    title="탭해서 미션 종류 변경"
                  >
                    {row.judgeType === "matching" ? "매칭 미션" : "일반 미션"}
                  </button>
                  <div className="flex shrink-0 items-center gap-1 text-white/40">
                    <button type="button" className="rotate-90 p-1 disabled:opacity-25" disabled={locked || index === 0} onClick={() => move(index, -1)} aria-label="위로">
                      <ChevronLeftIcon className="h-4 w-4" />
                    </button>
                    <button type="button" className="-rotate-90 p-1 disabled:opacity-25" disabled={locked || last} onClick={() => move(index, 1)} aria-label="아래로">
                      <ChevronLeftIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <input
                  className="mt-2.5 w-full bg-transparent text-[18px] font-extrabold outline-none placeholder:text-white/25 disabled:opacity-70"
                  value={row.content}
                  onChange={(event) => update(index, { content: event.target.value })}
                  disabled={locked}
                  maxLength={160}
                  placeholder="미션 내용을 입력해주세요"
                />
                <div className="mt-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-white/55">
                    <ClockIcon className="h-4 w-4" />
                    <input
                      className="w-10 bg-transparent text-[15px] font-bold outline-none"
                      type="number"
                      min={0.5}
                      max={60}
                      step={0.5}
                      disabled={locked}
                      value={row.durationSec / 60}
                      onChange={(event) => update(index, { durationSec: Math.round(Number(event.target.value) * 60) })}
                      aria-label="제한 시간(분)"
                    />
                    <span className="text-[15px] font-bold">분</span>
                  </span>
                  <button type="button" className="text-white/40 disabled:opacity-25" disabled={locked} onClick={() => setRows((current) => current.filter((_, i) => i !== index))} aria-label="미션 삭제">
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
                {row.judgeType === "matching" && (
                  <p className="mt-3 rounded-lg bg-cobalt/15 px-3 py-2 text-xs font-semibold leading-5 text-white/70">
                    사진을 등록한 참가자를 2인 또는 3인으로 매칭하고, QR 교환으로 자동 판정해요.
                  </p>
                )}
              </section>
            </div>
          );
        })}
        {!rows.length && (
          <p className="panel px-4 py-8 text-center text-[15px] font-semibold text-white/45">
            아직 등록된 미션이 없어요.<br />아래에서 첫 미션을 추가해보세요.
          </p>
        )}
      </div>

      {notice.error && <p className="mt-3 text-center text-sm font-bold text-red-400">{notice.error}</p>}
      {notice.message && <p className="mt-3 text-center text-sm font-bold text-acid">{notice.message}</p>}

      {!locked && (
        <div className="action-bar">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setRows((current) => [...current, { key: crypto.randomUUID(), content: "", durationSec: 300, judgeType: "self", autoTarget: null }])}
          >
            <PlusIcon className="h-5 w-5 text-acid" />미션 추가
          </button>
          <button type="button" className="btn-acid" onClick={save} disabled={pending || rows.some((row) => !row.content.trim())}>
            <CalendarIcon className="h-5 w-5" />
            {pending ? "저장 중…" : "시간표 저장"}
          </button>
        </div>
      )}
    </div>
  );
}
