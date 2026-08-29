"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

export function HostPartyQr({ url, name }: { url: string; name: string }) {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    QRCode.toDataURL(url, { width: 1000, margin: 1, errorCorrectionLevel: "M", color: { dark: "#0B0B0B", light: "#ffffff" } }).then(setSrc);
  }, [url]);
  return (
    <div className="text-center">
      {src ? (
        <>
          <img src={src} alt={`${name} 입장 QR`} className="mx-auto aspect-square w-full max-w-[15rem] rounded-2xl bg-white p-4" />
          <a href={src} download={`${name}-party-qr.png`} className="btn-ghost mt-4 w-full">QR 이미지 다운로드</a>
        </>
      ) : (
        <div className="mx-auto aspect-square w-full max-w-[15rem] animate-pulse rounded-2xl bg-white/10" />
      )}
      <p className="mt-3 break-all text-xs text-white/30">{url}</p>
    </div>
  );
}
