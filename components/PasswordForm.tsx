"use client";

import { useActionState } from "react";
import { changePassword } from "@/actions/profile";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, {});
  return (
    <form action={action} className="space-y-4">
      <label><span className="label">현재 비밀번호</span><input className="field" type="password" name="currentPassword" required /></label>
      <label><span className="label">새 비밀번호</span><input className="field" type="password" name="newPassword" required minLength={4} /></label>
      <label><span className="label">새 비밀번호 확인</span><input className="field" type="password" name="confirmPassword" required minLength={4} /></label>
      {state.error && <p className="text-sm font-semibold text-red-600">{state.error}</p>}
      {state.message && <p className="text-sm font-semibold text-green-700">{state.message}</p>}
      <button className="btn-primary w-full" disabled={pending}>변경하기</button>
    </form>
  );
}
