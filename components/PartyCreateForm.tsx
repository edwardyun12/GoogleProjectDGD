"use client";

import { useActionState } from "react";
import { createParty } from "@/actions/party";

export function PartyCreateForm() {
  const [state, action, pending] = useActionState(createParty, {});
  return <form action={action} className="mt-8 space-y-5"><label><span className="label">파티명</span><input className="field" name="name" required maxLength={50} placeholder="예: 여름밤 네트워킹" /></label><label><span className="label">호스트 초대 문구</span><textarea className="field min-h-24 resize-none" name="hostMessage" required maxLength={100} placeholder="오늘 새로운 세 사람과 인사해 보세요!" /></label><label><span className="label">호스트 PIN</span><input className="field" name="hostPin" required type="password" inputMode="numeric" pattern="[0-9]{4,8}" placeholder="숫자 4~8자리" /><span className="mt-2 block text-xs text-black/45">대시보드에 다시 들어올 때 사용해요.</span></label>{state.error && <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{state.error}</p>}<button className="btn-primary w-full" disabled={pending}>{pending ? "만드는 중…" : "파티 만들기"}</button></form>;
}
