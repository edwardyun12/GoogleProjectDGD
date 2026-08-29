"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updateProfile } from "@/actions/profile";
import type { Participant } from "@/types/database";

const mbti = ["ISTJ", "ISFJ", "INFJ", "INTJ", "ISTP", "ISFP", "INFP", "INTP", "ESTP", "ESFP", "ENFP", "ENTP", "ESTJ", "ESFJ", "ENFJ", "ENTJ"];

export function ProfileForm({ participant }: { participant: Participant }) {
  const [state, action, pending] = useActionState(updateProfile, {});
  return (
    <form action={action} className="space-y-5">
      <label><span className="label">닉네임</span><input className="field" name="nickname" required defaultValue={participant.nickname} /></label>
      <label><span className="label">나이</span><input className="field" name="age" type="number" inputMode="numeric" min={14} max={120} required defaultValue={participant.age ?? ""} /></label>
      <label><span className="label">성별</span><select className="field" name="gender" required defaultValue={participant.gender ?? ""}><option value="" disabled>선택해 주세요</option><option>여성</option><option>남성</option><option>논바이너리</option><option>응답하지 않음</option></select></label>
      <label><span className="label">MBTI</span><select className="field" name="mbti" required defaultValue={participant.mbti ?? ""}><option value="" disabled>선택해 주세요</option>{mbti.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label><span className="label">인상착의</span><textarea className="field min-h-28 resize-none" name="appearance" required maxLength={120} defaultValue={participant.appearance ?? ""} placeholder="예: 파란 셔츠와 둥근 안경" /><span className="mt-2 block text-xs leading-5 text-black/50">파티장에서 서로를 알아보고 첫마디를 건넬 때 사용해요.</span></label>
      {state.error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "저장 중…" : "프로필 저장"}</button>
      <Link href="/profile/password" className="btn-secondary w-full">비밀번호 변경</Link>
    </form>
  );
}
