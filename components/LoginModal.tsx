"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInOrUp, type SignInState } from "@/actions/auth";
import { EyeIcon, EyeOffIcon, UsersIcon } from "@/components/icons";

export function LoginModal({ entryCode, partyName }: { entryCode: string; partyName: string }) {
  const router = useRouter();
  const action = signInOrUp.bind(null, entryCode);
  const [state, formAction, pending] = useActionState<SignInState, FormData>(action, {});
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (state.ok && state.next) router.replace(state.next);
  }, [router, state]);

  return (
    <div className="sheet-scrim">
      <section className="sheet">
        <span className="grabber block" />
        <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-acid">
          <UsersIcon className="h-4 w-4" />
          {partyName}
        </p>
        <h2 className="mt-2 text-center text-[28px] font-extrabold tracking-tight">파티에 입장하기</h2>
        <p className="mt-1.5 text-center text-sm text-white/50">닉네임으로 빠르게 시작하세요</p>

        <form action={formAction} className="mt-7 space-y-5">
          <label className="block">
            <span className="label">이름(닉네임)</span>
            <input className="field" name="nickname" required minLength={2} maxLength={20} autoComplete="username" placeholder="이름을 입력해주세요" />
          </label>
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-white/70">비밀번호</span>
              <button type="submit" name="mode" value="signup" className="text-sm font-bold text-acid" disabled={pending}>
                처음 오셨나요?
              </button>
            </div>
            <div className="relative">
              <input
                className="field pr-12"
                name="password"
                type={visible ? "text" : "password"}
                required
                minLength={4}
                maxLength={72}
                autoComplete="current-password"
                placeholder="비밀번호를 입력해주세요"
              />
              <button
                type="button"
                onClick={() => setVisible((current) => !current)}
                className="absolute inset-y-0 right-3 grid w-8 place-items-center text-white/40"
                aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"}
              >
                {visible ? <EyeIcon className="h-5 w-5" /> : <EyeOffIcon className="h-5 w-5" />}
              </button>
            </div>
          </div>
          {state.error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-semibold text-red-300">{state.error}</p>}
          <button className="btn-acid w-full" name="mode" value="login" disabled={pending}>{pending ? "입장 중…" : "로그인"}</button>
          <button className="btn-ghost w-full" name="mode" value="signup" disabled={pending}>회원가입</button>
        </form>
      </section>
    </div>
  );
}
