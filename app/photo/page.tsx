import Link from "next/link";
import { AppBar } from "@/components/AppBar";
import { Decor } from "@/components/Decor";
import { PhotoForm } from "@/components/PhotoForm";
import { getParticipantContext } from "@/lib/data";
import { publicPhotoUrl } from "@/lib/photos";

export const dynamic = "force-dynamic";

export default async function PhotoPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const { participant } = await getParticipantContext();
  const fromCard = from === "card";
  const next = fromCard ? "/card" : "/home";
  const current = publicPhotoUrl(participant.photo_path);
  return (
    <main className="shell pad-b">
      <Decor variant="quiet" />
      <AppBar title={fromCard ? "카드 사진 변경" : "카드 사진 등록"} backHref={fromCard ? "/card" : undefined} bell={false} />
      <div className="pad relative z-10">
        <p className="flex items-center gap-2 text-sm font-bold text-cobalt">
          <span className="h-2 w-2 rounded-full bg-cobalt" />
          {fromCard ? "카드 사진" : "마지막 단계"}
        </p>
        <div className="hair mt-3" />
        <h2 className="mt-5 text-[28px] font-extrabold leading-tight tracking-tight">서로 알아볼 수 있는<br />사진을 골라주세요</h2>
        <p className="mb-8 mt-3 text-[15px] text-khaki/80">파티에서 나를 찾는 단서가 돼요</p>
        <PhotoForm next={next} current={current ?? undefined} submitLabel={fromCard ? "이 사진으로 변경" : "등록하고 파티 입장"} />
        {current && <Link href={next} className="btn-quiet mt-1 w-full">변경하지 않고 돌아가기</Link>}
      </div>
    </main>
  );
}
