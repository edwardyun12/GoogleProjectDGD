"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="mobile-shell grid min-h-dvh place-items-center p-6"><section className="card-panel text-center"><span className="text-5xl">⚠️</span><h1 className="mt-4 text-2xl font-black">잠시 연결이 끊겼어요</h1><p className="mt-2 leading-6 text-black/55">네트워크와 환경변수 설정을 확인한 뒤 다시 시도해 주세요.</p><button className="btn-primary mt-6 w-full" onClick={reset}>다시 시도</button></section></main>;
}
