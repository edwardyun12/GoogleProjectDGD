import Link from "next/link";
import { AppBar } from "@/components/AppBar";
import { BottomNav } from "@/components/BottomNav";
import { ConnectionCard } from "@/components/ConnectionCard";
import { ChatIcon, PersonCardIcon, QrGlyph, ScanIcon } from "@/components/icons";
import { getParticipantContext } from "@/lib/data";
import type { CardProfile } from "@/types/database";

export const dynamic = "force-dynamic";

interface CardRow { id: string; created_at: string; scanned: CardProfile | null }

export default async function CardPage() {
  const { participant, supabase } = await getParticipantContext(true);
  const { data } = await supabase
    .from("cards")
    .select("id,created_at,scanned:participants!cards_scanned_id_fkey(id,nickname,age_group,gender,mbti,bio,appearance,appearance_tags,photo_path)")
    .eq("scanner_id", participant.id)
    .order("created_at", { ascending: false });
  const cards = (data ?? []) as unknown as CardRow[];

  return (
    <main className="shell pb-48">
      <AppBar
        title="인맥 카드"
        bell={!cards.length}
        right={cards.length ? (
          <Link href="/photo?from=card" className="flex items-center gap-1.5 rounded-lg border border-line bg-panelHi px-3 py-2 text-sm font-bold">
            <PersonCardIcon className="h-4 w-4" />내 카드
          </Link>
        ) : undefined}
      />
      <div className="pad relative z-10">
        <p className="-mt-2 text-[15px] font-extrabold text-acid">{cards.length}명</p>

        {cards.length ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {cards.map((card) => card.scanned && <ConnectionCard key={card.id} profile={card.scanned} />)}
          </div>
        ) : (
          <section className="mt-14 text-center">
            <div className="relative mx-auto h-40 w-64" aria-hidden>
              <div className="absolute left-0 top-2 h-32 w-[7.5rem] bg-cobalt" style={{ clipPath: "polygon(0 4%, 100% 0, 100% 96%, 0 100%)" }} />
              <div className="absolute right-0 top-0 h-32 w-[7.5rem] bg-khaki" style={{ clipPath: "polygon(0 0, 100% 6%, 100% 100%, 0 94%)" }} />
              <span className="absolute left-1/2 top-[42%] h-5 w-[2px] -translate-x-1/2 rotate-0 bg-acid/80" />
              <span className="absolute left-[41%] top-[46%] h-4 w-[2px] -rotate-45 bg-acid/60" />
              <span className="absolute left-[59%] top-[46%] h-4 w-[2px] rotate-45 bg-acid/60" />
            </div>
            <h2 className="mt-8 text-[24px] font-extrabold tracking-tight">아직 교환한 카드가 없어요</h2>
            <p className="mt-3 text-[15px] text-white/45">먼저 QR을 보여주거나 상대의 QR을 스캔해보세요</p>
            <p className="mx-auto mt-8 flex w-fit items-center gap-3 rounded-xl bg-panelHi px-4 py-3.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/40 text-acid"><ChatIcon className="h-5 w-5" /></span>
              <span className="text-[15px] font-semibold text-white/80">안녕하세요, 카드 교환하실래요?</span>
            </p>
          </section>
        )}
      </div>

      <div className={`action-bar ${cards.length ? "" : "grid-cols-1"}`}>
        <Link href="/scan" className={cards.length ? "btn-ghost" : "btn-acid"}>
          <ScanIcon className={`h-5 w-5 ${cards.length ? "text-acid" : ""}`} />
          {cards.length ? "카드 추가하기" : "첫 카드 추가하기"}
        </Link>
        <Link href="/my_qr" className={cards.length ? "btn-acid" : "btn-outline"}>
          <QrGlyph className="h-5 w-5" />내 QR 보여주기
        </Link>
      </div>
      <BottomNav current="/card" />
    </main>
  );
}
