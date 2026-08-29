"use client";

import QrScannerLibrary from "qr-scanner";
import { useEffect, useRef, useState } from "react";

export function QrScanner({ onScan, className = "" }: { onScan: (value: string) => void; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const callbackRef = useRef(onScan);
  const [error, setError] = useState<string>();
  callbackRef.current = onScan;

  useEffect(() => {
    if (!videoRef.current) return;
    let live = true;
    const scanner = new QrScannerLibrary(
      videoRef.current,
      (result) => {
        if (live) callbackRef.current(result.data);
      },
      { highlightScanRegion: true, highlightCodeOutline: true, returnDetailedScanResult: true },
    );
    scanner.start().catch(() => {
      if (live) setError("카메라를 사용할 수 없습니다. 권한을 허용하거나 휴대폰 기본 카메라로 QR을 열어 주세요.");
    });
    return () => {
      live = false;
      scanner.destroy();
    };
  }, []);

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-black ${className}`}>
      <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
      <div className="pointer-events-none absolute inset-[12%] rounded-3xl border-2 border-lime/90" />
      {error && (
        <div className="absolute inset-0 grid place-items-center bg-ink p-6 text-center text-sm leading-6 text-white">
          {error}
        </div>
      )}
    </div>
  );
}
