import Link from "next/link";
import { CardsIcon, HomeIcon, QrGlyph } from "@/components/icons";

export function BottomNav({ current }: { current: "/home" | "/card" | "/my_qr" }) {
  const side = (active: boolean) => `flex flex-col items-center gap-1.5 py-1 text-[11px] font-bold ${active ? "text-acid" : "text-white/45"}`;
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto grid max-w-md grid-cols-3 items-end border-t border-line bg-ink px-6 pt-2.5">
      <Link href="/home" className={side(current === "/home")}>
        <HomeIcon className="h-6 w-6" />홈
      </Link>
      <Link href="/my_qr" className="flex flex-col items-center" aria-label="내 QR 보여주기">
        <span className={`-mt-8 grid h-[70px] w-[70px] place-items-center rounded-full ${current === "/my_qr" ? "bg-acid text-black shadow-glow" : "bg-acid text-black"}`}>
          <QrGlyph className="h-6 w-6" />
          <span className="mt-0.5 text-[11px] font-extrabold">내 QR</span>
        </span>
      </Link>
      <Link href="/card" className={side(current === "/card")}>
        <CardsIcon className="h-6 w-6" />카드
      </Link>
    </nav>
  );
}
