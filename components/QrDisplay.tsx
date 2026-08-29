"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

export function QrDisplay({ value, alt, className = "" }: { value: string; alt: string; className?: string }) {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    QRCode.toDataURL(value, { width: 900, margin: 1, errorCorrectionLevel: "M", color: { dark: "#0B0B0B", light: "#ffffff" } }).then(setSrc);
  }, [value]);
  if (!src) return <div className={`aspect-square w-full animate-pulse rounded-2xl bg-white/10 ${className}`} />;
  return <img src={src} alt={alt} className={`aspect-square w-full rounded-2xl bg-white p-5 ${className}`} />;
}
