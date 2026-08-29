import { AppBar } from "@/components/AppBar";
import { Decor } from "@/components/Decor";
import { PartyCreateForm } from "@/components/PartyCreateForm";

export default function NewPartyPage() {
  return (
    <main className="shell pad-b">
      <Decor variant="mid" />
      <AppBar title="파티 만들기" backHref="/enter" />
      <div className="pad relative z-10">
        <div className="flex items-center gap-3">
          <span className="text-sm font-extrabold"><span className="text-acid">1</span><span className="text-white/35"> / 2</span></span>
          <span className="flex h-[3px] flex-1 gap-1">
            <span className="flex-1 rounded-full bg-acid" />
            <span className="flex-1 rounded-full bg-white/12" />
          </span>
        </div>
        <h2 className="mt-7 text-[28px] font-extrabold tracking-tight">새로운 파티를 설정해요</h2>
        <p className="mb-6 mt-2 text-[15px] text-white/50">파티 정보를 입력하고 QR을 발급받아 보세요</p>
        <PartyCreateForm />
      </div>
    </main>
  );
}
