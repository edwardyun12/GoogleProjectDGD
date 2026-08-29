import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { MissionExperience } from "@/components/MissionExperience";
import { PartyHeader } from "@/components/PartyHeader";
import { getParticipantContext } from "@/lib/data";
import { advanceParty } from "@/lib/missions";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const { participant, party, supabase } = await getParticipantContext();
  const mission = await advanceParty(party.id);
  const [{ count: people }, { data: result }, { count: progress }] = await Promise.all([
    supabase.from("participants").select("id", { head: true, count: "exact" }).eq("party_id", party.id),
    mission ? supabase.from("mission_results").select("result").eq("mission_id", mission.id).eq("participant_id", participant.id).maybeSingle() : Promise.resolve({ data: null }),
    mission?.started_at ? supabase.from("cards").select("id", { head: true, count: "exact" }).eq("party_id", party.id).eq("scanner_id", participant.id).gte("created_at", mission.started_at) : Promise.resolve({ count: 0 }),
  ]);
  return (
    <main className="mobile-shell page-pad">
      {saved && <p className="mb-4 rounded-2xl bg-green-100 p-3 text-sm font-bold text-green-800">프로필을 저장했어요.</p>}
      <PartyHeader partyId={party.id} message={party.host_message} initialCount={people ?? 0} />
      <div className="mt-5"><MissionExperience partyId={party.id} initial={{ mission, result: (result?.result as "success" | "fail" | undefined) ?? null, progress: progress ?? 0 }} /></div>
      <section className="card-panel mt-5"><div className="flex items-start justify-between"><div><p className="text-sm font-bold text-black/45">MY PROFILE</p><h2 className="mt-1 text-3xl font-black">{participant.nickname}</h2></div><Link href="/profile" className="rounded-xl bg-paper px-3 py-2 text-sm font-bold">수정</Link></div><p className="mt-3 font-semibold text-black/60">{[participant.age && `${participant.age}세`, participant.gender, participant.mbti].filter(Boolean).join(" · ") || "프로필을 완성해 주세요"}</p><p className="mt-4 rounded-2xl bg-paper p-4 leading-6">{participant.appearance || "인상착의가 아직 없어요."}</p></section>
      <Link href="/my_qr" className="btn-lime mt-5 w-full py-5 text-lg">내 QR 바로 보여주기 ▦</Link>
      <BottomNav current="/home" />
    </main>
  );
}
