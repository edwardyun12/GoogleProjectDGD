"use client";

import QrScannerLibrary from "qr-scanner";
import { useEffect, useRef, useState } from "react";

export function QrScanner({
  onScan,
  onReady,
  className = "",
  frame = true,
}: {
  onScan: (value: string) => void;
  onReady?: (scanner: QrScannerLibrary) => void;
  className?: string;
  frame?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const callbackRef = useRef(onScan);
  const readyRef = useRef(onReady);
  const [error, setError] = useState<string>();
  callbackRef.current = onScan;
  readyRef.current = onReady;

  useEffect(() => {
    if (!videoRef.current) return;
    let live = true;
    const scanner = new QrScannerLibrary(
      videoRef.current,
      (result) => {
        if (live) callbackRef.current(result.data);
      },
      { highlightScanRegion: false, highlightCodeOutline: false, returnDetailedScanResult: true },
    );
    scanner.start().then(() => {
      if (live) readyRef.current?.(scanner);
    }).catch(() => {
      if (live) setError("카메라를 사용할 수 없습니다. 권한을 허용하거나 휴대폰 기본 카메라로 QR을 열어 주세요.");
    });
    return () => {
      live = false;
      scanner.destroy();
    };
  }, []);

  const corner = "absolute h-9 w-9 border-acid";
  return (
    <div className={`relative overflow-hidden bg-black ${className}`}>
      <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
      {frame && (
        <div className="pointer-events-none absolute inset-0">
          <span className={`${corner} left-4 top-4 rounded-tl-lg border-l-[5px] border-t-[5px]`} />
          <span className={`${corner} right-4 top-4 rounded-tr-lg border-r-[5px] border-t-[5px]`} />
          <span className={`${corner} bottom-4 left-4 rounded-bl-lg border-b-[5px] border-l-[5px]`} />
          <span className={`${corner} bottom-4 right-4 rounded-br-lg border-b-[5px] border-r-[5px]`} />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 grid place-items-center bg-panel p-6 text-center text-sm leading-6 text-white/70">
          {error}
        </div>
      )}
    </div>
  );
}
