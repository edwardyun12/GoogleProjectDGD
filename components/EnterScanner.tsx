"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { QrScanner } from "@/components/QrScanner";

export function EnterScanner() {
  const router = useRouter();
  const locked = useRef(false);
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
  return (
    <div>
      <QrScanner onScan={onScan} className="aspect-square w-full" />
      {error && <p className="mt-3 text-center text-sm font-semibold text-red-600">{error}</p>}
    </div>
  );
}
