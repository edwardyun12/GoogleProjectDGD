import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { getParticipantContext } from "@/lib/data";

export const dynamic = "force-dynamic";

interface CardRow { id: string; created_at: string; scanned: { nickname: string; age: number | null; gender: string | null; mbti: string | null; appearance: string | null } | null }

export default async function CardPage() {
  const { participant, supabase } = await getParticipantContext();
  const { data } = await supabase.from("cards").select("id,created_at,scanned:participants!cards_scanned_id_fkey(nickname,age,gender,mbti,appearance)").eq("scanner_id", participant.id).order("created_at", { ascending: false });
  const cards = (data ?? []) as unknown as CardRow[];
  return <main className="mobile-shell page-pad"><p className="text-sm font-black tracking-widest text-violet">NETWORK</p><h1 className="mt-2 text-4xl font-black">인맥 카드 <span className="text-violet">{cards.length}</span></h1>{cards.length ? <div className="mt-7 space-y-4">{cards.map((card) => card.scanned && <article key={card.id} className="card-panel"><div className="flex items-start justify-between"><h2 className="text-2xl font-black">{card.scanned.nickname}</h2><time className="text-xs font-semibold text-black/40">{new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(new Date(card.created_at))}</time></div><p className="mt-2 text-sm font-semibold text-black/50">{[card.scanned.age && `${card.scanned.age}세`, card.scanned.gender, card.scanned.mbti].filter(Boolean).join(" · ")}</p><p className="mt-4 rounded-2xl bg-paper p-4">{card.scanned.appearance}</p></article>)}</div> : <section className="card-panel mt-8 text-center"><span className="text-6xl">👋</span><h2 className="mt-4 text-2xl font-black">아직 카드가 없어요</h2><p className="mt-2 leading-6 text-black/55">내 QR을 먼저 보여주는 쪽이 더 쉬워요.<br />첫 교환을 시작해 볼까요?</p><Link href="/my_qr" className="btn-lime mt-6 w-full">내 QR 보여주기</Link></section>}<div className="mt-6 grid grid-cols-2 gap-3"><Link href="/scan" className="btn-secondary">카드 추가하기</Link><Link href="/my_qr" className="btn-lime">내 QR 보여주기</Link></div><BottomNav current="/card" /></main>;
}
