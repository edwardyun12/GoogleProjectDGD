"use client";

import { useActionState, useEffect, useState } from "react";
import { createParty } from "@/actions/party";
import { DragIcon, PlusIcon, QrGlyph, TrashIcon } from "@/components/icons";

const DRAFT_KEY = "htb:party-draft";

interface Draft { name: string; hostMessage: string; questions: string[] }

export function PartyCreateForm() {
  const [state, action, pending] = useActionState(createParty, {});
  const [name, setName] = useState("");
  const [hostMessage, setHostMessage] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [draftNotice, setDraftNotice] = useState<string>();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as Draft;
      setName(draft.name ?? "");
      setHostMessage(draft.hostMessage ?? "");
      setQuestions(draft.questions ?? []);
      setDraftNotice("임시 저장한 내용을 불러왔어요.");
    } catch { /* 손상된 초안은 무시 */ }
  }, []);

  const saveDraft = () => {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ name, hostMessage, questions } satisfies Draft));
      setDraftNotice("이 기기에 임시 저장했어요.");
    } catch {
      setDraftNotice("이 브라우저에는 임시 저장할 수 없어요.");
    }
  };

  return (
    <form action={action} className="space-y-3">
      <section className="panel px-4 py-3.5">
        <label className="block">
          <span className="text-sm font-semibold text-white/55">파티명</span>
          <input className="field-line mt-1" name="name" required maxLength={50} value={name} onChange={(event) => setName(event.target.value)} placeholder="예: 서울 크리에이터 나이트" />
        </label>
      </section>

      <section className="panel px-4 py-3.5">
        <label className="block">
          <span className="text-sm font-semibold text-white/55">호스트 문구</span>
          <textarea
            className="mt-1 w-full resize-none bg-transparent text-[17px] font-semibold outline-none placeholder:text-white/25"
            name="hostMessage"
            required
            rows={2}
            maxLength={100}
            value={hostMessage}
            onChange={(event) => setHostMessage(event.target.value)}
            placeholder="먼저 웃으면 대화가 시작돼요"
          />
          <span className="block text-right text-xs font-semibold text-white/35">{hostMessage.length} / 100</span>
        </label>
      </section>

      <section className="panel px-4 py-4">
        <p className="text-[15px] font-bold">프로필 커스텀 항목 <span className="text-xs font-medium text-white/40">(선택 · 최대 5개)</span></p>
        <div className="mt-3 space-y-2">
          {questions.map((question, index) => (
            <div key={index} className="flex items-center gap-2 rounded-lg border border-line bg-panelHi px-3 py-2">
              <DragIcon className="h-5 w-5 shrink-0 text-white/30" />
              <input
                className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold outline-none placeholder:text-white/25"
                name="customQuestion"
                maxLength={60}
                required
                value={question}
                onChange={(event) => setQuestions((current) => current.map((value, i) => i === index ? event.target.value : value))}
                placeholder="예: 요즘 가장 관심 있는 주제"
              />
              <button type="button" className="shrink-0 text-white/40" onClick={() => setQuestions((current) => current.filter((_, i) => i !== index))} aria-label="항목 삭제">
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
        {questions.length < 5 && (
          <button
            type="button"
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-acid/60 py-3.5 text-sm font-bold text-acid"
            onClick={() => setQuestions((current) => [...current, ""])}
          >
            <PlusIcon className="h-4 w-4" />항목 추가
          </button>
        )}
      </section>

      <section className="panel px-4 py-4">
        <p className="text-[15px] font-bold">호스트 PIN</p>
        <input className="field mt-3" name="hostPin" required type="password" inputMode="numeric" pattern="[0-9]{4,8}" placeholder="숫자 4~8자리" />
        <p className="mt-2 text-xs text-white/40">대시보드에 다시 들어올 때 사용해요.</p>
      </section>

      <section className="panel px-4 py-4">
        <p className="text-[15px] font-bold">파티 카드 미리보기</p>
        <div className="relative mt-3 h-[104px] overflow-hidden rounded-xl border border-line bg-ink">
          <div className="absolute inset-y-0 left-0 w-[46%] bg-cobalt" style={{ clipPath: "polygon(0 0, 78% 0, 100% 100%, 0 100%)" }} />
          <div className="absolute -right-4 top-3 h-[72px] w-24 bg-khaki" style={{ clipPath: "polygon(0 10%, 100% 0, 100% 90%, 0 100%)" }} />
          <div className="relative flex h-full flex-col justify-center px-4">
            <p className="truncate text-[19px] font-extrabold">{name || "파티명을 입력해주세요"}</p>
            <p className="mt-1 truncate text-[13px] font-semibold text-white/60">{hostMessage || "호스트 문구가 여기에 보여요"}</p>
          </div>
        </div>
      </section>

      {state.error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-bold text-red-300">{state.error}</p>}
      {draftNotice && <p className="text-center text-sm font-semibold text-white/45">{draftNotice}</p>}

      <button className="btn-acid w-full" disabled={pending}>
        <QrGlyph className="h-5 w-5" />
        {pending ? "만드는 중…" : "파티 QR 발급"}
      </button>
      <button type="button" className="btn-ghost w-full" onClick={saveDraft}>임시 저장</button>
    </form>
  );
}
