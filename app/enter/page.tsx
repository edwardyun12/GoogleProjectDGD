import Link from "next/link";
import { AppBar } from "@/components/AppBar";
import { EnterScanner } from "@/components/EnterScanner";
import { LoginModal } from "@/components/LoginModal";
import { getPartyByEntryCode } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function EnterPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  const party = p ? await getPartyByEntryCode(p) : null;
  return (
    <main className="shell pad-b">
      <AppBar title="파티 입장" />
      <div className="pad relative z-10">
        <EnterScanner />
        <div className="mt-7 text-center">
          {p && !party ? (
            <p className="font-bold text-red-400">유효하지 않은 파티 QR입니다.</p>
          ) : party ? (
            <>
              <p className="text-[15px] font-semibold text-white/75">{party.host_message}</p>
              <p className="mt-1 text-[17px] font-bold">
                <span className="text-acid">‘{party.name}’</span>으로 초대합니다
              </p>
            </>
          ) : (
            <>
              <p className="text-[15px] font-semibold text-white/75">낯선 사람도 편하게 시작할 수 있도록</p>
              <p className="mt-1 text-[17px] font-bold text-white/45">파티 QR을 스캔하면 입장할 수 있어요</p>
            </>
          )}
          <Link href="/host/new" className="mt-8 inline-block text-sm font-bold text-white/35 underline underline-offset-4">
            파티를 여시나요?
          </Link>
        </div>
      </div>
      {party && party.status !== "ended" && <LoginModal entryCode={party.entry_code} partyName={party.name} />}
      {party?.status === "ended" && (
        <div className="sheet-scrim">
          <section className="sheet text-center">
            <span className="grabber block" />
            <h2 className="mt-6 text-2xl font-extrabold">종료된 파티예요</h2>
            <p className="mb-6 mt-2 text-white/55">호스트에게 새 초대 QR을 요청해 주세요.</p>
          </section>
        </div>
      )}
    </main>
  );
}
