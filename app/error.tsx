"use client";

import { WarningIcon } from "@/components/icons";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="shell grid min-h-dvh place-items-center p-6">
      <section className="panel w-full p-6 text-center">
        <WarningIcon className="mx-auto h-10 w-10 text-acid" />
        <h1 className="mt-4 text-2xl font-extrabold">잠시 연결이 끊겼어요</h1>
        <p className="mt-2 leading-6 text-white/50">네트워크와 환경변수 설정을 확인한 뒤 다시 시도해 주세요.</p>
        <button className="btn-acid mt-6 w-full" onClick={reset}>다시 시도</button>
      </section>
    </main>
  );
}
