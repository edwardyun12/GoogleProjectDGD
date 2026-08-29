"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { updateProfile } from "@/actions/profile";
import { CheckIcon, CloseIcon } from "@/components/icons";
import type { Participant } from "@/types/database";

const MBTI = ["ISTJ", "ISFJ", "INFJ", "INTJ", "ISTP", "ISFP", "INFP", "INTP", "ESTP", "ESFP", "ENFP", "ENTP", "ESTJ", "ESFJ", "ENFJ", "ENTJ"];
const AGE_GROUPS = ["10대", "20대 초반", "20대 후반", "30대 초반", "30대 후반", "40대", "50대 이상", "응답하지 않음"];
const GENDERS = ["여성", "남성", "논바이너리", "응답하지 않음"];
const APPEARANCE_TAGS = ["밝은색 상의", "어두운색 상의", "셔츠", "후드/맨투맨", "재킷", "안경", "모자", "긴 머리", "짧은 머리"];

const chipOn = "peer-checked:border-acid peer-checked:bg-acid peer-checked:font-bold peer-checked:text-black";

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="panel p-4">
      <p className="mb-3 text-[15px] font-bold">
        {title}
        {hint && <span className="ml-1.5 text-xs font-medium text-white/40">{hint}</span>}
      </p>
      {children}
    </section>
  );
}

function Counted({ name, defaultValue, maxLength, placeholder, rows = 2, required = false }: {
  name: string; defaultValue: string; maxLength: number; placeholder: string; rows?: number; required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div>
      <textarea
        className="field resize-none"
        name={name}
        rows={rows}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <p className="mt-1.5 text-right text-xs font-semibold text-white/35">{value.length} / {maxLength}</p>
    </div>
  );
}

export function ProfileForm({ participant, isNew, questions }: { participant: Participant; isNew: boolean; questions: string[] }) {
  const [state, action, pending] = useActionState(updateProfile, {});
  const [step, setStep] = useState(isNew ? 1 : 2);
  const [nickname, setNickname] = useState(participant.nickname);

  return (
    <form
      action={action}
      className="pad relative z-10"
      onKeyDown={(event) => {
        // 1단계에서 Enter로 폼이 곧바로 제출되면 숨겨진 2단계 필수 항목에 걸린다.
        if (step === 1 && event.key === "Enter") event.preventDefault();
      }}
    >
      {isNew && <input type="hidden" name="next" value="/photo" />}

      <div className="flex items-center gap-3">
        <span className="text-sm font-extrabold">
          <span className="text-acid">{step}</span>
          <span className="text-white/35"> / 2</span>
        </span>
        <span className="flex h-[3px] flex-1 gap-1">
          <span className="flex-1 rounded-full bg-acid" />
          <span className={`flex-1 rounded-full ${step === 2 ? "bg-acid" : "bg-white/12"}`} />
        </span>
      </div>

      {/* 1단계 — 계정 */}
      <section className={step === 1 ? "" : "hidden"}>
        <h2 className="mt-9 text-[30px] font-extrabold leading-tight tracking-tight">먼저 계정을 만들어요</h2>
        <p className="mt-3 text-[15px] text-white/50">파티에서 사용할 이름을 확인해주세요</p>

        <label className="mt-9 block">
          <span className="label">이름(닉네임)</span>
          <span className="relative block">
            <input
              className="field pr-12 text-[17px] font-bold"
              name="nickname"
              required
              minLength={2}
              maxLength={20}
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
            />
            {nickname && (
              <button type="button" onClick={() => setNickname("")} className="absolute inset-y-0 right-3 my-auto grid h-6 w-6 place-items-center rounded-full bg-white/15 text-white/70" aria-label="이름 지우기">
                <CloseIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </span>
        </label>

        <div className="mt-6">
          <span className="label">비밀번호</span>
          <div className="flex items-center justify-between rounded-xl border border-line bg-panelHi px-4 py-3.5">
            <span className="text-lg tracking-[0.3em] text-white/45">••••••••</span>
            <Link href="/profile/password" className="text-sm font-bold text-acid">변경</Link>
          </div>
          <p className="mt-2 text-sm text-khaki/70">비밀번호는 가입할 때만 입력해요</p>
        </div>

        <button type="button" className="btn-acid mt-12 w-full" disabled={nickname.trim().length < 2} onClick={() => setStep(2)}>
          다음
        </button>
      </section>

      {/* 2단계 — 프로필 */}
      <section className={step === 2 ? "" : "hidden"}>
        <div className="mt-6 flex items-baseline justify-between">
          <h2 className="text-[26px] font-extrabold tracking-tight">파티에서 나를 소개해요</h2>
          <button type="button" className="shrink-0 text-sm font-bold text-white/40" onClick={() => setStep(1)}>계정</button>
        </div>

        <div className="mt-5 space-y-3">
          <Panel title="한 줄 설명">
            <Counted name="bio" defaultValue={participant.bio ?? ""} maxLength={80} required placeholder="나를 한 줄로 설명해주세요" />
          </Panel>

          <Panel title="연령대">
            <div className="grid grid-cols-3 gap-2">
              {AGE_GROUPS.map((value) => (
                <label key={value} className="block">
                  <input type="radio" name="ageGroup" value={value} required defaultChecked={participant.age_group === value} className="peer sr-only" />
                  <span className={`chip w-full ${chipOn}`}>{value}</span>
                </label>
              ))}
            </div>
          </Panel>

          <Panel title="성별">
            <div className="grid grid-cols-4 gap-2">
              {GENDERS.map((value) => (
                <label key={value} className="block">
                  <input type="radio" name="gender" value={value} required defaultChecked={participant.gender === value} className="peer sr-only" />
                  <span className={`chip w-full px-1 text-[13px] ${chipOn}`}>{value}</span>
                </label>
              ))}
            </div>
          </Panel>

          <Panel title="MBTI">
            <div className="grid grid-cols-4 gap-2">
              {MBTI.map((value) => (
                <label key={value} className="block">
                  <input type="radio" name="mbti" value={value} required defaultChecked={participant.mbti === value} className="peer sr-only" />
                  <span className={`chip w-full px-1 ${chipOn}`}>{value}</span>
                </label>
              ))}
            </div>
          </Panel>

          <Panel title="오늘의 인상착의" hint="(복수 선택)">
            <div className="flex flex-wrap gap-2">
              {APPEARANCE_TAGS.map((value) => (
                <label key={value} className="block">
                  <input type="checkbox" name="appearanceTags" value={value} defaultChecked={participant.appearance_tags?.includes(value)} className="peer sr-only" />
                  <span className={`chip rounded-full ${chipOn}`}>
                    <CheckIcon className="h-3.5 w-3.5" />
                    {value}
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-3">
              <Counted name="appearance" defaultValue={participant.appearance ?? ""} maxLength={120} placeholder="덧붙일 내용을 입력해주세요 (선택)" />
            </div>
          </Panel>

          {questions.map((question, index) => (
            <Panel key={question} title={question} hint="(호스트 질문)">
              <input className="field" name={`custom_${index}`} required maxLength={120} defaultValue={participant.custom_answers?.[question] ?? ""} placeholder="답변을 입력해주세요" />
            </Panel>
          ))}
        </div>

        {state.error && <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-semibold text-red-300">{state.error}</p>}
        <button className="btn-acid mt-4 w-full" disabled={pending}>{pending ? "저장 중…" : isNew ? "저장하고 사진 선택" : "프로필 저장"}</button>
        {!isNew && <Link href="/home" className="btn-quiet mt-1 w-full">돌아가기</Link>}
      </section>
    </form>
  );
}
