"use client";

import type QrScannerLibrary from "qr-scanner";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { QrScanner } from "@/components/QrScanner";
import { FlashIcon } from "@/components/icons";

export function EnterScanner() {
  const router = useRouter();
  const locked = useRef(false);
  const scannerRef = useRef<QrScannerLibrary>(null);
  const [ready, setReady] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [error, setError] = useState<string>();

  const onScan = useCallback((raw: string) => {
    if (locked.current) return;
    try {
      const url = new URL(raw);
      const code = url.searchParams.get("p");
      if (!code) throw new Error();
      locked.current = true;
      router.replace(`/enter?p=${encodeURIComponent(code)}`);
    } catch {
      setError("파티 입장용 QR이 아닙니다.");
    }
  }, [router]);

  const onReady = useCallback((scanner: QrScannerLibrary) => {
    scannerRef.current = scanner;
    setReady(true);
    scanner.hasFlash().then(setHasFlash).catch(() => setHasFlash(false));
  }, []);

  const toggleFlash = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      await scanner.toggleFlash();
      setFlashOn(scanner.isFlashOn());
    } catch { /* 플래시를 지원하지 않는 기기 */ }
  };

  return (
    <div>
      <p className="flex justify-center">
        <span className="badge bg-panelHi px-3.5 py-2 text-acid">
          <span className={`h-1.5 w-1.5 rounded-full ${ready ? "bg-acid" : "bg-white/40"}`} />
          {ready ? "스캔 준비 완료" : "카메라 연결 중"}
        </span>
      </p>
      <h2 className="mt-4 text-center text-[22px] font-extrabold">
        파티 <span className="text-acid">QR</span>을 화면 안에 맞춰주세요
      </h2>
      <div className="mt-6">
        <QrScanner onScan={onScan} onReady={onReady} className="aspect-[4/5] w-full rounded-2xl border border-line" />
      </div>
      {error && <p className="mt-3 text-center text-sm font-semibold text-red-400">{error}</p>}
      {hasFlash && (
        <button type="button" onClick={toggleFlash} className={`btn-ghost mx-auto mt-6 flex w-56 ${flashOn ? "border-acid/70 text-acid" : ""}`}>
          <FlashIcon className="h-5 w-5" />
          {flashOn ? "라이트 끄기" : "라이트 켜기"}
        </button>
      )}
    </div>
  );
}
