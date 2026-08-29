import { notFound } from "next/navigation";
import { AppBar } from "@/components/AppBar";
import { Decor } from "@/components/Decor";
import { HostDashboard, type ActivityItem } from "@/components/HostDashboard";
import { HostLoginForm } from "@/components/HostLoginForm";
import { HostNav } from "@/components/HostNav";
import { HostPartyQr } from "@/components/HostPartyQr";
import { PartyThumb } from "@/components/PartyThumb";
import { getAppUrl } from "@/lib/env";
import { advanceParty, getHostMissionViews, getMatchingSuccessRate } from "@/lib/missions";
import { hasHostSession } from "@/lib/session";
import { getAdminClient } from "@/lib/supabase";
import type { Party } from "@/types/database";

export const dynamic = "force-dynamic";

const STATUS = {
  ready: { label: "준비 중", dot: "bg-white/50" },
  running: { label: "진행 중", dot: "bg-acid" },
  ended: { label: "종료됨", dot: "bg-khaki" },
} as const;

export default async function HostDashboardPage({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = await params;
  const supabase = getAdminClient();
  const { data } = await supabase.from("parties").select("id,name,host_message,profile_questions,entry_code,status,created_at,started_at,ended_at").eq("id", partyId).maybeSingle();
  if (!data) notFound();
  const party = data as Party;

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

  const missions = await advanceParty(partyId);
  const [{ data: participants }, { count: exchangeCount }, { data: exchanges }] = await Promise.all([
    supabase.from("participants").select("id,nickname,created_at").eq("party_id", partyId).order("created_at", { ascending: false }),
    supabase.from("card_exchanges").select("id", { head: true, count: "exact" }).eq("party_id", partyId),
    supabase.from("card_exchanges").select("id,created_at,participant_a,participant_b").eq("party_id", partyId).order("created_at", { ascending: false }).limit(6),
  ]);
  const participantCount = participants?.length ?? 0;
  const [missionViews, matchingRate] = await Promise.all([
    getHostMissionViews(partyId, missions, participantCount),
    getMatchingSuccessRate(partyId),
  ]);

  const nameOf = new Map((participants ?? []).map((person) => [person.id, person.nickname]));
  const activity: ActivityItem[] = [
    ...(exchanges ?? []).map((row) => ({
      id: `x${row.id}`,
      kind: "exchange" as const,
      text: `${nameOf.get(row.participant_a) ?? "참가자"} · ${nameOf.get(row.participant_b) ?? "참가자"} 카드 교환`,
      at: row.created_at,
    })),
    ...(participants ?? []).slice(0, 6).map((person) => ({
      id: `j${person.id}`,
      kind: "join" as const,
      text: `${person.nickname} 입장`,
      at: person.created_at,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);

  const statusStyle = STATUS[party.status];

  return (
    <main className="shell pad-b">
      <Decor variant="top" />
      <AppBar title="파티 대시보드" />
      <div className="pad relative z-10">
        <div className="mb-5 flex items-center gap-3">
          <PartyThumb name={party.name} />
          <div className="min-w-0">
            <p className="truncate text-[19px] font-extrabold tracking-tight">{party.name}</p>
            <p className="flex items-center gap-1.5 text-sm font-bold text-acid">
              <span className={`h-2 w-2 rounded-full ${statusStyle.dot}`} />
              {statusStyle.label}
            </p>
          </div>
        </div>

        <HostDashboard
          partyId={partyId}
          initialStatus={party.status}
          initialStats={{ missions: missionViews, participantCount, exchangeCount: exchangeCount ?? 0, matchingRate }}
          activity={activity}
        />

        <details className="panel mt-4 px-4 py-4">
          <summary className="cursor-pointer text-[15px] font-bold">입장 QR 보기</summary>
          <div className="mt-5">
            <HostPartyQr url={`${getAppUrl()}/enter?p=${party.entry_code}`} name={party.name} />
          </div>
        </details>
      </div>
      <HostNav partyId={partyId} current="dashboard" />
    </main>
  );
}
