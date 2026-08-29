"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

export function HostPartyQr({ url, name }: { url: string; name: string }) {
  const [src, setSrc] = useState<string>();
  useEffect(() => { QRCode.toDataURL(url, { width: 1000, margin: 2, errorCorrectionLevel: "M" }).then(setSrc); }, [url]);
  return <div className="text-center">{src ? <>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={src} alt={`${name} 입장 QR`} className="mx-auto aspect-square w-full max-w-xs rounded-3xl bg-white p-3" />
    <a href={src} download={`${name}-party-qr.png`} className="btn-secondary mt-4">QR 이미지 다운로드</a>
  </> : <div className="mx-auto aspect-square w-full max-w-xs animate-pulse rounded-3xl bg-black/5" />}<p className="mt-3 break-all text-xs text-black/40">{url}</p></div>;
}
