"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

export function QrDisplay({ value, alt }: { value: string; alt: string }) {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    QRCode.toDataURL(value, { width: 900, margin: 2, errorCorrectionLevel: "M", color: { dark: "#171717", light: "#ffffff" } }).then(setSrc);
  }, [value]);
  if (!src) return <div className="aspect-square w-full animate-pulse rounded-3xl bg-black/5" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className="aspect-square w-full rounded-3xl bg-white p-3" />;
}
