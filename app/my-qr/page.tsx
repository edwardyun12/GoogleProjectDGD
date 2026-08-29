import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { QrDisplay } from "@/components/QrDisplay";
import { WakeLock } from "@/components/WakeLock";
import { getParticipantContext } from "@/lib/data";
import { getAppUrl } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function MyQrPage() {
  const { participant } = await getParticipantContext();
  const url = `${getAppUrl()}/scan?c=${encodeURIComponent(participant.card_token)}`;
  return <main className="mobile-shell page-pad flex min-h-dvh flex-col bg-ink text-white"><WakeLock /><div className="flex items-center justify-between"><Link href="/home" className="font-bold text-white/65">← 홈</Link><span className="rounded-full bg-lime px-3 py-1 text-xs font-black text-ink">MY QR</span></div><div className="my-auto py-8"><p className="text-center text-lg font-bold text-lime">제 프로필 추가하세요</p><h1 className="mb-6 mt-2 text-center text-4xl font-black">{participant.nickname}</h1><QrDisplay value={url} alt={`${participant.nickname}님의 인맥 카드 QR`} /><p className="mt-5 text-center text-lg font-bold">{participant.appearance}</p><p className="mt-2 text-center text-sm text-white/50">상대방이 카메라로 스캔하면 카드가 추가돼요.</p></div><BottomNav current="/my_qr" /></main>;
}
