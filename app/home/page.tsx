import Link from "next/link";
import { AppBar } from "@/components/AppBar";
import { BottomNav } from "@/components/BottomNav";
import { Decor } from "@/components/Decor";
import { MissionExperience } from "@/components/MissionExperience";
import { PartyHeader } from "@/components/PartyHeader";
import { PencilIcon, ShirtIcon } from "@/components/icons";
import { getParticipantContext } from "@/lib/data";
import { advanceParty, getMissionViews } from "@/lib/missions";
import { publicPhotoUrl } from "@/lib/photos";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ saved?: string; photo?: string }> }) {
  const { saved, photo } = await searchParams;
  const { participant, party, supabase } = await getParticipantContext(true);
  const missions = await advanceParty(party.id);
  const [{ count: people }, missionViews] = await Promise.all([
    supabase.from("participants").select("id", { head: true, count: "exact" }).eq("party_id", party.id),
    getMissionViews(party.id, participant.id, missions),
  ]);
  const photoUrl = publicPhotoUrl(participant.photo_path);
  const notice = saved ? "프로필을 저장했어요." : photo ? "카드 사진을 등록했어요." : null;
  const appearance = participant.appearance_tags?.length ? participant.appearance_tags.join(" · ") : participant.appearance;

  return (
    <main className="shell pad-b">
      <Decor variant="top" />
      <AppBar title="오늘의 파티" />
      <div className="pad relative z-10">
        {notice && <p className="mb-4 rounded-xl border border-acid/40 bg-acid/10 px-4 py-3 text-sm font-bold text-acid">{notice}</p>}
        <div className="pt-4">
          <PartyHeader partyId={party.id} message={party.host_message} initialCount={people ?? 0} />
        </div>

        <div className="mt-8">
          <MissionExperience partyId={party.id} initial={{ missions: missionViews }} />
        </div>

        <section className="panel mt-4 px-4 py-4">
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-bold">내 프로필</p>
            <Link href="/profile" className="flex items-center gap-1.5 text-sm font-semibold text-white/65">
              <PencilIcon className="h-4 w-4" />수정
            </Link>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <span className="grid h-[86px] w-[86px] shrink-0 place-items-center overflow-hidden rounded-full bg-white/10">
              {photoUrl ? (
                <img src={photoUrl} alt="내 카드 사진" className="h-full w-full object-cover" />
              ) : (
                <span className="text-lg font-extrabold text-white/60">{participant.mbti ?? "ME"}</span>
              )}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-[26px] font-extrabold tracking-tight">{participant.nickname}</h2>
              <p className="mt-0.5 text-[15px] font-bold text-khaki">{[participant.age_group, participant.mbti].filter(Boolean).join(" · ")}</p>
            </div>
          </div>
          <div className="hair my-4" />
          <p className="text-[15px] font-semibold">{participant.bio || "나를 설명하는 한 줄을 추가해 주세요."}</p>
          <div className="hair my-4" />
          <p className="flex items-center gap-2.5 text-[15px] font-semibold text-khaki">
            <ShirtIcon className="h-5 w-5 shrink-0" />
            {appearance || "인상착의가 아직 없어요."}
          </p>
        </section>
      </div>
      <BottomNav current="/home" />
    </main>
  );
}
