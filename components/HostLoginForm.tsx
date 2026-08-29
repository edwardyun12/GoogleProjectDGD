"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { hostLogin } from "@/actions/party";

export function HostLoginForm({ partyId }: { partyId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(hostLogin.bind(null, partyId), {});
  useEffect(() => { if (state.ok) router.refresh(); }, [router, state.ok]);
  return <form action={action} className="card-panel mt-8 space-y-4"><label><span className="label">호스트 PIN</span><input className="field" name="pin" type="password" inputMode="numeric" required autoFocus /></label>{state.error && <p className="text-sm font-bold text-red-600">{state.error}</p>}<button className="btn-primary w-full" disabled={pending}>대시보드 열기</button></form>;
}
