import { notFound } from "next/navigation";
import { HostDashboard } from "@/components/HostDashboard";
import { HostLoginForm } from "@/components/HostLoginForm";
import { HostNav } from "@/components/HostNav";
import { HostPartyQr } from "@/components/HostPartyQr";
import { getAppUrl } from "@/lib/env";
import { advanceParty } from "@/lib/missions";
import { hasHostSession } from "@/lib/session";
import { getAdminClient } from "@/lib/supabase";
import type { Party } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function HostDashboardPage({ params }: { params: Promise<{ partyId: string }> }) {
  const { partyId } = await params;
  const supabase = getAdminClient();
  const { data } = await supabase.from("parties").select("id,name,host_message,entry_code,status,created_at,started_at,ended_at").eq("id", partyId).maybeSingle();
  if (!data) notFound();
  const party = data as Party;
  if (!(await hasHostSession(partyId))) return <main className="mobile-shell page-pad"><p className="text-sm font-black text-violet">{party.name}</p><h1 className="mt-2 text-3xl font-black">호스트 인증</h1><HostLoginForm partyId={partyId} /></main>;
  const mission = await advanceParty(partyId);
  const [{ count: participantCount }, { count: cardCount }, { data: pending }] = await Promise.all([
    supabase.from("participants").select("id", { head: true, count: "exact" }).eq("party_id", partyId),
    supabase.from("cards").select("id", { head: true, count: "exact" }).eq("party_id", partyId),
    supabase.from("missions").select("duration_sec").eq("party_id", partyId).eq("status", "pending"),
  ]);
  const pendingMinutes = Math.ceil((pending ?? []).reduce((sum, row) => sum + row.duration_sec, 0) / 60);
  return <main className="mobile-shell page-pad"><HostNav partyId={partyId} current="dashboard" /><div className="mb-6"><p className="text-sm font-black tracking-widest text-violet">{party.status.toUpperCase()}</p><h1 className="mt-1 text-4xl font-black">{party.name}</h1></div><HostDashboard partyId={partyId} initialStatus={party.status} initialStats={{ mission, participantCount: participantCount ?? 0, cardCount: cardCount ?? 0 }} pendingMinutes={pendingMinutes} /><details className="card-panel mt-5"><summary className="cursor-pointer font-black">입장 QR 보기</summary><div className="mt-5"><HostPartyQr url={`${getAppUrl()}/enter?p=${party.entry_code}`} name={party.name} /></div></details></main>;
}
