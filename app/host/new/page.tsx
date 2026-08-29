import Link from "next/link";
import { PartyCreateForm } from "@/components/PartyCreateForm";

export default function NewPartyPage() {
  return <main className="mobile-shell page-pad"><Link href="/enter" className="font-bold text-black/45">← 입장 화면</Link><p className="mt-8 text-sm font-black tracking-widest text-violet">HOST</p><h1 className="mt-2 text-4xl font-black">새 파티 만들기</h1><p className="mt-3 leading-6 text-black/55">초대 QR과 운영 대시보드를 바로 만들어요.</p><PartyCreateForm /></main>;
}
