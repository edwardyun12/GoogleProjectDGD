import Link from "next/link";
import { EnterScanner } from "@/components/EnterScanner";
import { LoginModal } from "@/components/LoginModal";
import { getPartyByEntryCode } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function EnterPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  const party = p ? await getPartyByEntryCode(p) : null;
  return (
    <main className="mobile-shell page-pad flex min-h-dvh flex-col">
      <header><p className="text-sm font-black tracking-[.18em] text-violet">HACK THE BEAT</p><h1 className="mt-2 text-4xl font-black tracking-tight">파티에 입장해요.</h1></header>
      <div className="my-auto py-8"><EnterScanner /></div>
      <div className="text-center">
        {p && !party ? <p className="font-bold text-red-600">유효하지 않은 파티 QR입니다.</p> : party ? <><p className="font-semibold">{party.host_message}</p><p className="mt-1 text-lg font-black">‘{party.name}’으로 초대합니다</p></> : <><p className="font-bold">파티 QR을 스캔해 주세요</p><p className="mt-1 text-sm text-black/50">기본 카메라로 QR을 열어도 입장할 수 있어요.</p></>}
        <Link href="/host/new" className="mt-6 inline-block text-sm font-bold text-black/45 underline">파티를 여시나요?</Link>
      </div>
      {party && party.status !== "ended" && <LoginModal entryCode={party.entry_code} partyName={party.name} />}
      {party?.status === "ended" && <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-5"><section className="card-panel text-center"><h2 className="text-2xl font-black">종료된 파티예요</h2><p className="mt-2 text-black/55">호스트에게 새 초대 QR을 요청해 주세요.</p></section></div>}
    </main>
  );
}
