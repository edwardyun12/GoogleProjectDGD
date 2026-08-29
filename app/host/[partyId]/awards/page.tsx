import { notFound } from "next/navigation";
import { AppBar } from "@/components/AppBar";
import { AwardsBoard, type AwardRow } from "@/components/AwardsBoard";
import { Decor } from "@/components/Decor";
import { HostLoginForm } from "@/components/HostLoginForm";
import { HostNav } from "@/components/HostNav";
import { PartyThumb } from "@/components/PartyThumb";
import { publicPhotoUrl } from "@/lib/photos";
import { hasHostSession } from "@/lib/session";
import { getAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const STATUS_LABEL = { ready: "준비 중", running: "진행 중", ended: "파티 종료" } as const;

export default async function AwardsPage({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = await params;
  const supabase = getAdminClient();
  const { data: party } = await supabase.from("parties").select("id,name,status,started_at,ended_at").eq("id", partyId).maybeSingle();
  if (!party) notFound();

  if (!(await hasHostSession(partyId))) {
    return (
      <main className="shell pad-b">
        <AppBar title="호스트 인증" />
        <div className="pad relative z-10">
          <p className="text-sm font-bold text-acid">{party.name}</p>
          <HostLoginForm partyId={partyId} />
        </div>
      </main>
    );
  }

  const [{ data: participants }, { data: cards }, { data: missions }] = await Promise.all([
    supabase.from("participants").select("id,nickname,photo_path").eq("party_id", partyId),
    supabase.from("cards").select("scanner_id").eq("party_id", partyId),
    supabase.from("missions").select("judge_type,mission_results(participant_id,result)").eq("party_id", partyId),
  ]);

  const cardCounts = new Map<string, number>();
  for (const card of cards ?? []) cardCounts.set(card.scanner_id, (cardCounts.get(card.scanner_id) ?? 0) + 1);
  const matchingCounts = new Map<string, number>();
  const generalCounts = new Map<string, number>();
  for (const mission of missions ?? []) {
    for (const result of mission.mission_results ?? []) {
      if (result.result !== "success") continue;
      const target = mission.judge_type === "matching" ? matchingCounts : generalCounts;
      target.set(result.participant_id, (target.get(result.participant_id) ?? 0) + 1);
    }
  }

  const rows: AwardRow[] = (participants ?? []).map((person) => ({
    id: person.id,
    nickname: person.nickname,
    photoUrl: publicPhotoUrl(person.photo_path),
    cards: cardCounts.get(person.id) ?? 0,
    matching: matchingCounts.get(person.id) ?? 0,
    general: generalCounts.get(person.id) ?? 0,
  }));

  const minutes = party.started_at && party.ended_at
    ? Math.max(1, Math.round((new Date(party.ended_at).getTime() - new Date(party.started_at).getTime()) / 60_000))
    : null;

  return (
    <main className="shell pad-b">
      <Decor variant="top" />
      <AppBar title="파티 결과" />
      <div className="pad relative z-10">
        <div className="mb-5 flex items-center gap-3">
          <PartyThumb name={party.name} />
          <div className="min-w-0">
            <p className="truncate text-[19px] font-extrabold tracking-tight">{party.name}</p>
            <p className="text-sm font-bold">
              <span className="text-acid">{STATUS_LABEL[party.status as keyof typeof STATUS_LABEL]}</span>
              {minutes && <span className="text-white/45"> · {minutes}분</span>}
            </p>
          </div>
        </div>

        <AwardsBoard
          rows={rows}
          stats={{
            participants: rows.length,
            cards: cards?.length ?? 0,
            matching: [...matchingCounts.values()].reduce((sum, value) => sum + value, 0),
          }}
        />
      </div>
      <HostNav partyId={partyId} current="awards" />
    </main>
  );
}
