"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInOrUp, type SignInState } from "@/actions/auth";

export function LoginModal({ entryCode, partyName }: { entryCode: string; partyName: string }) {
  const router = useRouter();
  const action = signInOrUp.bind(null, entryCode);
  const [state, formAction, pending] = useActionState<SignInState, FormData>(action, {});

  useEffect(() => {
    if (state.ok && state.next) router.replace(state.next);
  }, [router, state]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-5">
      <section className="w-full max-w-md rounded-t-[2rem] bg-paper p-6 shadow-2xl sm:rounded-[2rem]">
        <p className="text-sm font-bold text-violet">{partyName}</p>
        <h2 className="mt-1 text-3xl font-black tracking-tight">닉네임으로 입장</h2>
        <p className="mt-2 text-sm leading-6 text-black/55">처음이면 바로 가입되고, 다시 왔다면 같은 비밀번호로 이어서 입장해요.</p>
        <form action={formAction} className="mt-6 space-y-4">
          <label><span className="label">닉네임</span><input className="field" name="nickname" required minLength={2} maxLength={20} autoComplete="username" /></label>
          <label><span className="label">비밀번호</span><input className="field" name="password" type="password" required minLength={4} maxLength={72} autoComplete="current-password" /></label>
          {state.error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{state.error}</p>}
          <button className="btn-primary w-full" disabled={pending}>{pending ? "입장 중…" : "입장하기"}</button>
        </form>
      </section>
    </div>
  );
}
